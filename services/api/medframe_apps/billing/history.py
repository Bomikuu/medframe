"""Bounded ledger reads. Every public entry point rechecks its current scope."""

from django.db.models import BigIntegerField, F, Sum, Value
from django.db.models.functions import Coalesce

from config.errors import DomainError
from medframe_apps.billing.calculations import amount_text, invoice_totals, money
from medframe_apps.billing.models import Invoice
from medframe_apps.billing.policy import get_invoice, staff_member
from medframe_apps.portal.policy import require_portal_link
from medframe_apps.record_filters import page_records


def payment_query(invoice):
    return invoice.payments.annotate(
        returned=Coalesce(Sum("refunds__amount"), Value(0), output_field=BigIntegerField())
    )


def payment_data(payment, *, portal=False):
    return {
        "id": str(payment.id),
        "amount": amount_text(payment.amount),
        "method": payment.method,
        "paid_date": payment.paid_date.isoformat(),
        "refundable": amount_text(payment.amount - payment.returned),
        **({} if portal else {"reference": payment.reference}),
    }


def history_page(invoice, kind, after=None, *, portal=False):
    if kind not in {"payments", "events", "refundable"} or (portal and kind == "refundable"):
        raise DomainError("INVALID_INPUT", "Choose payments or financial history.")
    if kind == "events":
        query = invoice.events.select_related("actor").exclude(kind="save")

        def serialize(event):
            return {
                "id": str(event.id),
                "kind": event.kind,
                "created_at": event.created_at.isoformat(),
                "amount": amount_text(event.payload.get("amount", 0)),
                **({} if portal else {"reason": event.reason, "actor": event.actor.display_name}),
            }

    else:
        query = payment_query(invoice)
        if kind == "refundable":
            query = query.filter(amount__gt=F("returned"))

        def serialize(payment):
            return payment_data(payment, portal=portal)

    return page_records(
        query,
        scope=f"invoice-history:{invoice.organization_id}:{invoice.id}:{invoice.version}:{portal}:{kind}",
        after=after,
        serialize=serialize,
    )


def staff_history(request, organization_id, invoice_id, kind, after=None):
    permission = "billing.adjust" if kind == "refundable" else "billing.read"
    invoice = get_invoice(staff_member(request, organization_id, permission), invoice_id)
    return history_page(invoice, kind, after)


def portal_invoice(request, link_id, invoice_id):
    link = require_portal_link(request, link_id)
    invoice = (
        Invoice.objects.select_related("patient", "branch", "organization")
        .filter(
            id=invoice_id,
            organization_id=link.organization_id,
            patient_id=link.patient_id,
            state="issued",
        )
        .first()
    )
    if invoice is None:
        raise DomainError("NOT_FOUND", "This statement is unavailable.", 404)
    return invoice


def portal_history(request, link_id, invoice_id, kind, after=None):
    return history_page(portal_invoice(request, link_id, invoice_id), kind, after, portal=True)


def payment_confirmation(invoice, payment_id, *, portal=False):
    payment = payment_query(invoice).filter(id=payment_id).first()
    if payment is None or invoice.state == "draft":
        raise DomainError("NOT_FOUND", "This recorded payment is unavailable.", 404)
    return {
        "invoice_id": str(invoice.id),
        "invoice_number": invoice.number,
        "invoice_version": invoice.version,
        "invoice_state": invoice.state,
        "patient_name": invoice.patient.full_name,
        "branch_name": invoice.branch.name,
        "currency": invoice.currency,
        "recorded_at": payment.created_at.isoformat(),
        "refunded": amount_text(payment.returned),
        "retained": amount_text(payment.amount - payment.returned),
        "outstanding": amount_text(invoice_totals(invoice)["outstanding"]),
        "refunds": [
            {
                "id": str(row.id),
                "amount": amount_text(row.amount),
                "paid_date": row.paid_date.isoformat(),
                "recorded_at": row.created_at.isoformat(),
                **({} if portal else {"actor": row.actor.display_name, "reason": row.reason}),
            }
            for row in payment.refunds.select_related("actor").order_by("-created_at", "-id")[:20]
        ],
        "refunds_truncated": payment.refunds.count() > 20,
        "payment": payment_data(payment, portal=portal),
    }


def staff_confirmation(request, organization_id, invoice_id, payment_id):
    invoice = get_invoice(staff_member(request, organization_id), invoice_id)
    return payment_confirmation(invoice, payment_id)


def payment_review(request, organization_id, invoice_id, expected_version, amount):
    from medframe_apps.billing.installment_projection import invoice_due_projection, serialize_due

    invoice = get_invoice(staff_member(request, organization_id, "payments.record"), invoice_id)
    if invoice.version != expected_version or invoice.state != "issued":
        raise DomainError("CONFLICT", "Reload the invoice before reviewing this payment.", 409)
    received = money(amount)
    if not 0 < received <= invoice_totals(invoice)["outstanding"]:
        raise DomainError("INVALID_INPUT", "Use a positive amount within the outstanding balance.")
    return {
        "invoice_version": invoice.version,
        "amount": amount_text(received),
        "after": serialize_due(invoice_due_projection(invoice, additional_payment=received)),
    }
