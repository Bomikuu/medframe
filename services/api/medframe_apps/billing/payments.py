from zoneinfo import ZoneInfo

from django.db.models import Sum
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.billing.calculations import invoice_totals, money
from medframe_apps.billing.models import CreditNote, Payment, Refund


def record_financial_action(request, invoice, action, data):
    if invoice.state != "issued":
        raise DomainError("CONFLICT", "Only issued invoices accept financial entries.", 409)
    amount = money(data.amount)
    totals = invoice_totals(invoice)
    if action != "void" and amount <= 0:
        raise DomainError("INVALID_INPUT", "Enter an amount greater than zero.")
    today = timezone.localdate(timezone=ZoneInfo(invoice.organization.timezone))
    paid_date = data.paid_date or today
    if (
        paid_date > today
        or paid_date < invoice.issued_at.astimezone(ZoneInfo(invoice.organization.timezone)).date()
    ):
        raise DomainError("INVALID_INPUT", "Use a payment date between invoice issue and today.")
    if action == "payment":
        if amount > totals["outstanding"]:
            raise DomainError("CONFLICT", "Payment exceeds the current outstanding balance.", 409)
        row = Payment.objects.create(
            invoice=invoice,
            amount=amount,
            method=data.method,
            reference=data.reference,
            paid_date=paid_date,
            actor=request.user,
        )
    elif action == "credit":
        if not data.reason:
            raise DomainError("INVALID_INPUT", "Enter a reason for the credit.")
        if amount > invoice.total - totals["credits"]:
            raise DomainError("CONFLICT", "Credits exceed the issued charge.", 409)
        row = CreditNote.objects.create(
            invoice=invoice, amount=amount, reason=data.reason, actor=request.user
        )
    elif action == "refund":
        if not data.reason:
            raise DomainError("INVALID_INPUT", "Enter a reason for the refund.")
        payment = invoice.payments.select_for_update().filter(id=data.payment_id).first()
        if payment is None:
            raise DomainError("NOT_FOUND", "Choose a payment from this invoice.", 404)
        refunded = payment.refunds.aggregate(value=Sum("amount"))["value"] or 0
        if amount > payment.amount - refunded:
            raise DomainError("CONFLICT", "Refund exceeds this payment's remaining amount.", 409)
        row = Refund.objects.create(
            payment=payment,
            amount=amount,
            reason=data.reason,
            paid_date=paid_date,
            actor=request.user,
        )
    elif action == "void":
        if not data.reason or totals["paid"] or totals["credits"] or totals["refunded"]:
            raise DomainError("CONFLICT", "Void requires a reason and no financial entries.", 409)
        invoice.state = "void"
        row = invoice
    else:
        raise DomainError("INVALID_INPUT", "Choose a supported financial action.")
    return {"record_id": str(row.id), "amount": amount}
