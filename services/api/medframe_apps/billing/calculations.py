"""Only this server-side owner converts decimal input into integer minor units."""

import re
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Sum

from config.errors import DomainError

MAX_AMOUNT = 999_999_999
MONEY = re.compile(r"\d{1,10}(?:\.\d{1,2})?\Z")


def money(value: str) -> int:
    if not isinstance(value, str) or not MONEY.fullmatch(value):
        raise DomainError("INVALID_INPUT", "Enter a nonnegative amount with at most two decimals.")
    result = int(Decimal(value) * 100)
    if result > MAX_AMOUNT:
        raise DomainError("INVALID_INPUT", "Amounts cannot exceed PHP 9,999,999.99.")
    return result


def amount_text(value):
    return f"{Decimal(value) / 100:.2f}"


def draft_totals(lines, discount_kind, discount_value):
    subtotal = sum(row.quantity * money(row.unit_amount) for row in lines)
    if subtotal > MAX_AMOUNT:
        raise DomainError("INVALID_INPUT", "The invoice exceeds PHP 9,999,999.99.")
    value = money(discount_value)
    if discount_kind == "percent":
        if value > 10000:
            raise DomainError("INVALID_INPUT", "Discount percentage must be between 0 and 100.")
        discount = int((Decimal(subtotal) * value / 10000).quantize(Decimal(1), ROUND_HALF_UP))
    else:
        discount = value
    if discount > subtotal:
        raise DomainError("INVALID_INPUT", "Discount cannot exceed the subtotal.")
    return {"subtotal": subtotal, "discount": discount, "total": subtotal - discount}


def invoice_totals(invoice):
    from medframe_apps.billing.models import Refund

    paid = invoice.payments.aggregate(value=Sum("amount"))["value"] or 0
    refunded = (
        Refund.objects.filter(payment__invoice=invoice).aggregate(value=Sum("amount"))["value"] or 0
    )
    credits = invoice.credits.aggregate(value=Sum("amount"))["value"] or 0
    charge = invoice.total - credits
    received = paid - refunded
    outstanding = max(charge - received, 0) if invoice.state == "issued" else 0
    refundable = max(received - charge, 0) if invoice.state == "issued" else 0
    status = (
        invoice.state
        if invoice.state != "issued"
        else "refund_due"
        if refundable
        else "paid"
        if not outstanding
        else "partial"
        if received
        else "unpaid"
    )
    return {
        "subtotal": invoice.subtotal,
        "discount": invoice.discount,
        "total": invoice.total,
        "credits": credits,
        "paid": paid,
        "refunded": refunded,
        "net_received": received,
        "outstanding": outstanding,
        "refundable": refundable,
        "payment_status": status,
    }
