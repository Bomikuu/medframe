"""Native financial reporting only: closed clinic-day comparisons, no money movement."""

from datetime import datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.billing.calculations import amount_text
from medframe_apps.billing.models import BillingSettings, Payment, Refund
from medframe_apps.billing.policy import invoice_scope, scoped_branches, staff_member
from medframe_apps.billing.queries import annotated_invoices


def series_rows(query, date_field, currency_field, start, end):
    rows = query.filter(**{f"{date_field}__gte": start, f"{date_field}__lt": end})
    date = F(date_field)
    return rows.annotate(day=date).values("day", currency_field).annotate(amount=Sum("amount"))


def period_totals(points):
    return {
        key: f"{sum(Decimal(row[key]) for row in points):.2f}"
        for key in ["issued", "payments", "refunds", "net"]
    }


@transaction.atomic
def financial_overview(request, organization_id, branch_id, days=30):
    member = staff_member(request, organization_id)
    branch = scoped_branches(member).filter(id=branch_id).first()
    if branch is None:
        raise DomainError("NOT_FOUND", "Choose a permitted clinic branch.", 404)
    if type(days) is not int or days not in {7, 30, 90}:
        raise DomainError("INVALID_INPUT", "Choose a 7, 30 or 90 day comparison.")
    zone = ZoneInfo(member.organization.timezone)
    today = timezone.now().astimezone(zone).date()
    current_start, previous_start = today - timedelta(days=days), today - timedelta(days=days * 2)
    invoices = invoice_scope(member).filter(branch=branch, state="issued")
    currencies = set(invoices.values_list("currency", flat=True))
    configured = (
        BillingSettings.objects.filter(organization_id=organization_id)
        .values_list("currency", flat=True)
        .first()
        or "PHP"
    )
    currencies.add(configured)
    start_time, end_time = (
        datetime.combine(previous_start, time.min, zone),
        datetime.combine(today, time.min, zone),
    )
    issued = (
        invoices.filter(issued_at__gte=start_time, issued_at__lt=end_time)
        .annotate(day=TruncDate("issued_at", tzinfo=zone))
        .values("day", "currency")
        .annotate(amount=Sum("total"))
    )
    payments = series_rows(
        Payment.objects.filter(invoice__in=invoices),
        "paid_date",
        "invoice__currency",
        previous_start,
        today,
    )
    refunds = series_rows(
        Refund.objects.filter(payment__invoice__in=invoices),
        "paid_date",
        "payment__invoice__currency",
        previous_start,
        today,
    )
    daily = {}
    for metric, rows, field in [
        ("issued", issued, "currency"),
        ("payments", payments, "invoice__currency"),
        ("refunds", refunds, "payment__invoice__currency"),
    ]:
        for row in rows:
            daily.setdefault((row[field], row["day"]), {})[metric] = row["amount"] or 0
    balances = annotated_invoices(invoices)
    snapshot = {
        row["currency"]: row
        for row in balances.values("currency").annotate(
            outstanding=Sum("balance_amount"),
            overdue=Sum("balance_amount", filter=Q(due_date__lt=today)),
            unpaid_count=Count("id", filter=Q(balance_amount__gt=0)),
            not_due=Sum("balance_amount", filter=Q(due_date__gte=today)),
            days_1_30=Sum(
                "balance_amount",
                filter=Q(due_date__gte=today - timedelta(days=30), due_date__lt=today),
            ),
            days_31_60=Sum(
                "balance_amount",
                filter=Q(
                    due_date__gte=today - timedelta(days=60),
                    due_date__lt=today - timedelta(days=30),
                ),
            ),
            days_61_plus=Sum("balance_amount", filter=Q(due_date__lt=today - timedelta(days=60))),
        )
    }
    methods = (
        Payment.objects.filter(
            invoice__in=invoices, paid_date__gte=current_start, paid_date__lt=today
        )
        .values("invoice__currency", "method")
        .annotate(amount=Sum("amount"))
    )
    method_rows = list(methods)
    results = []
    for currency in sorted(currencies):
        points = []
        for offset in range(days * 2):
            day = previous_start + timedelta(days=offset)
            point = {
                key: daily.get((currency, day), {}).get(key, 0)
                for key in ["issued", "payments", "refunds"]
            }
            point["net"] = point["payments"] - point["refunds"]
            points.append(
                {
                    "date": day.isoformat(),
                    **{key: amount_text(value) for key, value in point.items()},
                }
            )
        current, previous = points[days:], points[:days]
        balance = snapshot.get(currency, {})
        results.append(
            {
                "currency": currency,
                "current": period_totals(current),
                "previous": period_totals(previous),
                "series": current,
                "previous_series": previous,
                "outstanding": amount_text(balance.get("outstanding") or 0),
                "overdue": amount_text(balance.get("overdue") or 0),
                "unpaid_count": balance.get("unpaid_count", 0),
                "aging": [
                    {"label": label, "amount": amount_text(balance.get(key) or 0)}
                    for key, label in [
                        ("not_due", "Not due"),
                        ("days_1_30", "1–30 days"),
                        ("days_31_60", "31–60 days"),
                        ("days_61_plus", "61+ days"),
                    ]
                ],
                "methods": [
                    {"method": row["method"], "amount": amount_text(row["amount"])}
                    for row in method_rows
                    if row["invoice__currency"] == currency
                ],
            }
        )
    audit(request.user, "billing.overview.read", organization_id, branch.id)
    return {
        "branch_id": str(branch.id),
        "branch": branch.name,
        "timezone": str(zone),
        "days": days,
        "current_from": current_start.isoformat(),
        "current_to": (today - timedelta(days=1)).isoformat(),
        "previous_from": previous_start.isoformat(),
        "previous_to": (current_start - timedelta(days=1)).isoformat(),
        "as_of": timezone.now().isoformat(),
        "currencies": results,
    }
