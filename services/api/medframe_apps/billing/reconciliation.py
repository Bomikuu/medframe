"""A scoped day worksheet, never an accounting close or a new financial ledger."""

from datetime import date
from zoneinfo import ZoneInfo

from django.db.models import Count, Sum
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.billing.calculations import amount_text
from medframe_apps.billing.models import Payment, Refund
from medframe_apps.billing.policy import invoice_scope, scoped_branches, staff_member


def day_reconciliation(request, organization_id, branch_id, day):
    member = staff_member(request, organization_id)
    branch = scoped_branches(member).filter(id=branch_id).first()
    if branch is None:
        raise DomainError("NOT_FOUND", "Choose a permitted clinic branch.", 404)
    zone = ZoneInfo(branch.organization.timezone)
    if not isinstance(day, date) or day > timezone.now().astimezone(zone).date():
        raise DomainError("INVALID_INPUT", "Choose today or an earlier clinic date.")
    invoices = invoice_scope(member).filter(branch=branch, state="issued")
    payments = Payment.objects.filter(invoice__in=invoices, paid_date=day)
    refunds = Refund.objects.filter(payment__invoice__in=invoices, paid_date=day)
    received = list(
        payments.values("invoice__currency", "method").annotate(
            amount=Sum("amount"), count=Count("id")
        )
    )
    returned = list(
        refunds.values("payment__invoice__currency", "payment__method").annotate(
            amount=Sum("amount"), count=Count("id")
        )
    )
    keys = {(row["invoice__currency"], row["method"]) for row in received} | {
        (row["payment__invoice__currency"], row["payment__method"]) for row in returned
    }
    rows = []
    for currency, method in sorted(keys):
        paid = next(
            (
                row
                for row in received
                if row["invoice__currency"] == currency and row["method"] == method
            ),
            {},
        )
        refund = next(
            (
                row
                for row in returned
                if row["payment__invoice__currency"] == currency
                and row["payment__method"] == method
            ),
            {},
        )
        gross, returns = paid.get("amount", 0), refund.get("amount", 0)
        rows.append(
            {
                "currency": currency,
                "method": method,
                "payments": amount_text(gross),
                "refunds": amount_text(returns),
                "net": amount_text(gross - returns),
                "payment_count": paid.get("count", 0),
                "refund_count": refund.get("count", 0),
            }
        )
    audit(request.user, "billing.reconciliation.read", organization_id, branch.id)
    return {
        "date": day.isoformat(),
        "branch": branch.name,
        "timezone": str(zone),
        "as_of": timezone.now().isoformat(),
        "rows": rows,
    }
