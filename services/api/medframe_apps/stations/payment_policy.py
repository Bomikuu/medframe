"""Operational clearance, never a payment writer or reusable payment proof."""

from django.db import transaction

from config.errors import DomainError
from medframe_apps.billing.installment_projection import invoice_due_projection
from medframe_apps.billing.models import Invoice
from medframe_apps.billing.policy import get_invoice, staff_member
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.operations.policy import require_operations, require_provider_scope
from medframe_apps.stations.models import VisitStage


def lock_visit_for_ticket(ticket_id):
    link = (
        VisitStage.objects.filter(queue_ticket_id=ticket_id)
        .values("visit__branch_id", "visit__patient_id")
        .first()
    )
    if link:
        advisory_lock(f"station-visit:{link['visit__branch_id']}:{link['visit__patient_id']}")


def clearance(stage, *, invoice=None):
    required = stage.department.payment_timing == "before" and stage.department.kind != "cashier"
    if not required:
        return {"required": False, "blocked": False, "message": "Payment after service"}
    invoice = invoice or (
        Invoice.objects.filter(
            id=stage.payment_invoice_id,
            organization_id=stage.visit.branch.organization_id,
            branch_id=stage.visit.branch_id,
            patient_id=stage.visit.patient_id,
        ).first()
    )
    if invoice is None or invoice.state != "issued":
        return {
            "required": True,
            "blocked": True,
            "message": "An issued invoice must be linked by financial staff before service.",
        }
    blocked = invoice_due_projection(invoice)["due_now"] > 0
    return {
        "required": True,
        "blocked": blocked,
        "message": "Cashier confirmation is needed for the amount due through today."
        if blocked
        else "Nothing is due through today. Future installments remain scheduled.",
    }


def require_clearance(request, stage, exception_reason=""):
    if stage.department.payment_timing != "before" or stage.department.kind == "cashier":
        return
    # Same lock as native financial posting: coverage cannot race a payment/refund.
    invoice = Invoice.objects.select_for_update().filter(id=stage.payment_invoice_id).first()
    result = clearance(stage, invoice=invoice)
    if not result["blocked"]:
        return
    reason = str(exception_reason).strip()
    if not reason:
        raise DomainError(
            "PAYMENT_REQUIRED", result["message"] + " Transfer this visit to cashier.", 409
        )
    if not 10 <= len(reason) <= 240:
        raise DomainError("INVALID_INPUT", "Record an exception reason of 10–240 characters.")
    staff_member(request, stage.visit.branch.organization_id, "billing.adjust")
    require_operations(
        request, stage.visit.branch.organization_id, "queues.manage", stage.visit.branch_id
    )
    from medframe_apps.stations.kiosk_visits import record

    record(
        request.user,
        stage.visit.branch,
        stage,
        "payment.exception",
        reason,
        invoice_id=str(invoice.id) if invoice else None,
    )


@transaction.atomic
def link_invoice(request, stage, invoice_id, expected_version):
    from medframe_apps.stations.kiosk_visits import record, synchronize

    branch = stage.visit.branch
    operator = require_operations(request, branch.organization_id, "queues.manage", branch.id)
    if stage.queue_ticket_id:
        require_provider_scope(operator, stage.queue_ticket.provider_id)
    member = staff_member(request, branch.organization_id)
    advisory_lock(f"station-visit:{branch.id}:{stage.visit.patient_id}")
    stage = (
        VisitStage.objects.select_for_update(of=("self",))
        .select_related("visit__branch__organization", "department", "queue_ticket")
        .get(id=stage.id)
    )
    synchronize(stage)
    check_version(stage.version, expected_version)
    if stage.status not in {"waiting", "called"}:
        raise DomainError("CONFLICT", "Link an invoice before this service starts.", 409)
    invoice = get_invoice(member, invoice_id, lock=True)
    if (
        invoice.patient_id != stage.visit.patient_id
        or invoice.branch_id != stage.visit.branch_id
        or invoice.state != "issued"
    ):
        raise DomainError("NOT_FOUND", "Choose an issued invoice for this patient and branch.", 404)
    stage.payment_invoice = invoice
    stage.version += 1
    stage.save(update_fields=["payment_invoice", "version"])
    record(request.user, branch, stage, "payment.invoice_linked", invoice_id=str(invoice.id))
    return stage
