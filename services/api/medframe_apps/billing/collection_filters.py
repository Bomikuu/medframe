"""Invoice-specific read filters; due dates use the native obligation projection."""

from typing import Literal
from zoneinfo import ZoneInfo

from django.utils import timezone

from pydantic import Field, ValidationError

from config.errors import DomainError
from medframe_apps.billing.installment_projection import invoice_due_projection
from medframe_apps.record_filters import RecordFilter


class BillingRecordFilter(RecordFilter):
    balance: Literal["outstanding", "due", "overdue", "future"] | None = None
    date_basis: Literal["created", "issued"] = "created"
    currency: str | None = Field(default=None, min_length=3, max_length=3, pattern="^[A-Z]{3}$")


def parse_billing_filters(value):
    try:
        return BillingRecordFilter.model_validate(value or {})
    except ValidationError:
        raise DomainError("INVALID_INPUT", "Check the invoice filters and date range.") from None


def filter_current_balance(query, balance, timezone_name):
    if not balance:
        return query
    candidates = query.filter(state="issued", balance_amount__gt=0)
    if balance == "outstanding":
        return candidates
    key = {"due": "due_now", "overdue": "overdue", "future": "future"}[balance]
    today = timezone.localdate(timezone=ZoneInfo(timezone_name))
    # Filter every scoped candidate before pagination, not just the visible page.
    # Reuse the ledger projection so partial payments, refunds and credits agree
    # with invoice details; the invoice's final due date is not an installment proxy.
    matches = []
    rows = candidates.select_related("organization").prefetch_related(
        "installment__obligations", "credits", "payments__refunds"
    )
    for row in rows.iterator(chunk_size=200):
        if invoice_due_projection(row, today)[key] > 0:
            matches.append(row.id)
    return query.filter(pk__in=matches)
