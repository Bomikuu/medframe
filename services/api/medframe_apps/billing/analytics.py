"""Native financial reporting only: closed clinic-day comparisons, no money movement."""

from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import F, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.analytics.periods import report_period
from medframe_apps.auditing.services import audit
from medframe_apps.billing.calculations import amount_text
from medframe_apps.billing.models import BillingSettings, Payment, Refund
from medframe_apps.billing.policy import invoice_scope, scoped_branches, staff_member


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
def financial_overview(
    request, organization_id, branch_id, days=30, *, start_date=None, end_date=None
):
    member = staff_member(request, organization_id)
    branch = scoped_branches(member).filter(id=branch_id).first()
    if branch is None:
        raise DomainError("NOT_FOUND", "Choose a permitted clinic branch.", 404)
    period = report_period(member.organization, days, start_date=start_date, end_date=end_date)
    zone, today, days = period["zone"], period["today"], period["days"]
    current_start, previous_start, end = period["start"], period["previous"], period["end"]
    invoices = invoice_scope(member).filter(branch=branch, state="issued")
    currencies = set(invoices.values_list("currency", flat=True))
    configured = (
        BillingSettings.objects.filter(organization_id=organization_id)
        .values_list("currency", flat=True)
        .first()
        or "PHP"
    )
    currencies.add(configured)
    start_time, _, end_time = period["bounds"]
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
        end,
    )
    refunds = series_rows(
        Refund.objects.filter(payment__invoice__in=invoices),
        "paid_date",
        "payment__invoice__currency",
        previous_start,
        end,
    )
    daily = {}
    for metric, rows, field in [
        ("issued", issued, "currency"),
        ("payments", payments, "invoice__currency"),
        ("refunds", refunds, "payment__invoice__currency"),
    ]:
        for row in rows:
            daily.setdefault((row[field], row["day"]), {})[metric] = row["amount"] or 0
    from medframe_apps.billing.installment_projection import financial_due_snapshot

    snapshot = financial_due_snapshot(invoices, today)
    methods = (
        Payment.objects.filter(
            invoice__in=invoices, paid_date__gte=current_start, paid_date__lt=end
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
                "due_now": amount_text(balance.get("due_now") or 0),
                "future": amount_text(balance.get("future") or 0),
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
        "current_to": (end - timedelta(days=1)).isoformat(),
        "previous_from": previous_start.isoformat(),
        "previous_to": (current_start - timedelta(days=1)).isoformat(),
        "as_of": timezone.now().isoformat(),
        "currencies": results,
    }
