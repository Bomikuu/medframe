from zoneinfo import ZoneInfo

from django.db.models import Prefetch
from django.utils import timezone

from medframe_apps.billing.calculations import amount_text
from medframe_apps.billing.installment_schedule import ScheduledAmount, project_obligations
from medframe_apps.billing.models import InstallmentAgreement, Payment

MONEY_KEYS = {
    "total",
    "credits",
    "net_received",
    "outstanding",
    "refundable",
    "due_now",
    "overdue",
    "future",
    "original",
    "credited",
    "effective",
    "covered",
    "remaining",
}


def serialize_due(projection, portal=False):
    def convert(value):
        if isinstance(value, list):
            return [convert(x) for x in value]
        if isinstance(value, dict):
            return {
                key: amount_text(item) if key in MONEY_KEYS else convert(item)
                for key, item in value.items()
            }
        return value

    return convert(projection)


def invoice_due_projection(invoice, today=None, *, additional_payment=0):
    today = today or timezone.localdate(timezone=ZoneInfo(invoice.organization.timezone))
    try:
        agreement = invoice.installment
    except InstallmentAgreement.DoesNotExist:
        agreement = None
    rows = (
        [
            ScheduledAmount(x.position, x.kind, x.due_date, x.amount, str(x.id))
            for x in agreement.obligations.all()
        ]
        if agreement
        else [ScheduledAmount(0, "invoice", invoice.due_date, invoice.total, str(invoice.id))]
    )
    from medframe_apps.billing.calculations import invoice_totals

    totals = invoice_totals(invoice)
    result = project_obligations(
        rows,
        totals["paid"] + additional_payment,
        totals["refunded"],
        totals["credits"],
        today,
        invoice.state,
    )
    result["is_installment"] = bool(agreement)
    return result


def invoice_due_projections(invoices, today=None):
    from django.db.models import prefetch_related_objects

    rows = list(invoices)
    prefetch_related_objects(
        rows,
        "organization",
        "installment__obligations",
        "credits",
        Prefetch("payments", queryset=Payment.objects.prefetch_related("refunds")),
    )
    return {row.id: invoice_due_projection(row, today) for row in rows}


def financial_due_snapshot(invoices, today):
    """Aggregate every obligation, never just the visible invoice page."""
    snapshot = {}
    for invoice in (
        invoices.select_related("organization")
        .prefetch_related("installment__obligations", "credits", "payments__refunds")
        .iterator(chunk_size=200)
    ):
        due = invoice_due_projection(invoice, today)
        balance = snapshot.setdefault(
            invoice.currency,
            {
                key: 0
                for key in [
                    "outstanding",
                    "due_now",
                    "future",
                    "overdue",
                    "unpaid_count",
                    "not_due",
                    "days_1_30",
                    "days_31_60",
                    "days_61_plus",
                ]
            },
        )
        for key in ["outstanding", "due_now", "future", "overdue"]:
            balance[key] += due[key]
        balance["unpaid_count"] += bool(due["outstanding"])
        from datetime import date

        for row in due["rows"]:
            age = (today - date.fromisoformat(row["due_date"])).days
            key = (
                "not_due"
                if age <= 0
                else "days_1_30"
                if age <= 30
                else "days_31_60"
                if age <= 60
                else "days_61_plus"
            )
            balance[key] += row["remaining"]
    return snapshot
