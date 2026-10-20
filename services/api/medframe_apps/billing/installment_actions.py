from zoneinfo import ZoneInfo

from django.utils import timezone

from config.errors import DomainError
from medframe_apps.billing.calculations import money
from medframe_apps.billing.installment_schedule import build_schedule
from medframe_apps.billing.models import InstallmentAgreement, InstallmentObligation
from medframe_apps.idempotency import request_digest
from medframe_apps.services.policy import case_record
from medframe_apps.services.policy import member as service_member


def save_installment_draft(request, member, invoice, data):
    existing = InstallmentAgreement.objects.filter(invoice=invoice).first()
    if not data:
        if existing:
            existing.obligations.all().delete()
            existing.delete()
        return
    actor = service_member(request, member.organization_id, "services.work")
    case = case_record(actor, data.case_id, lock=True)
    lines = list(invoice.lines.select_related("service_source"))
    if (
        case.status == "cancelled"
        or case.patient_id != invoice.patient_id
        or case.branch_id != invoice.branch_id
        or len(lines) != 1
        or lines[0].quantity != 1
        or not hasattr(lines[0], "service_source")
        or lines[0].service_source.service_id != case.service_id
        or lines[0].service_source.service_version != case.service_version
    ):
        raise DomainError(
            "INVALID_INPUT", "Use one matching service charge and patient workflow for this plan."
        )
    if InstallmentAgreement.objects.filter(case=case).exclude(invoice=invoice).exists():
        raise DomainError("CONFLICT", "This patient service already has an invoice.", 409)
    if existing and existing.case_id != case.id:
        raise DomainError("CONFLICT", "Create a new draft to change the patient service.", 409)
    rows = build_schedule(
        invoice.total, money(data.deposit), data.months, data.first_due, data.deposit_due
    )
    terms = data.model_dump(mode="json")
    agreement = existing or InstallmentAgreement(invoice=invoice, case=case)
    agreement.terms, agreement.source_snapshot = terms, lines[0].service_source.snapshot
    agreement.save()
    agreement.obligations.all().delete()
    InstallmentObligation.objects.bulk_create(
        [
            InstallmentObligation(
                agreement=agreement,
                position=x.position,
                kind=x.kind,
                due_date=x.due_date,
                amount=x.amount,
            )
            for x in rows
        ]
    )
    invoice.due_date = rows[-1].due_date
    invoice.save(update_fields=["due_date"])


def agreement_review(invoice):
    agreement = InstallmentAgreement.objects.filter(invoice=invoice).first()
    if not agreement:
        return None
    content = {
        "invoice_id": str(invoice.id),
        "version": invoice.version,
        "total": invoice.total,
        "case_id": str(agreement.case_id),
        "terms": agreement.terms,
        "rows": [
            {
                "id": str(x.id),
                "position": x.position,
                "kind": x.kind,
                "due_date": x.due_date.isoformat(),
                "amount": x.amount,
            }
            for x in agreement.obligations.all()
        ],
    }
    return {
        "digest": request_digest(content),
        "terms": agreement.terms,
        "source": agreement.source_snapshot,
        "confirmed": bool(agreement.confirmed_at),
    }


def issue_installment(request, invoice, confirmed, digest):
    agreement = InstallmentAgreement.objects.filter(invoice=invoice).first()
    if not agreement:
        return
    review = agreement_review(invoice)
    if not confirmed or digest != review["digest"]:
        raise DomainError(
            "CONFLICT", "Review and confirm the current installment schedule before issue.", 409
        )
    today = timezone.localdate(timezone=ZoneInfo(invoice.organization.timezone))
    if agreement.obligations.filter(due_date__lt=today).exists():
        raise DomainError(
            "CONFLICT", "Review payment dates: an obligation is now before today.", 409
        )
    agreement.confirmed_at = timezone.now()
    agreement.confirmed_by = request.user
    agreement.confirmed_digest = digest
    agreement.save(update_fields=["confirmed_at", "confirmed_by", "confirmed_digest"])


def link_service_case(request, actor, invoice, case_id):
    from medframe_apps.billing.models import ServiceCaseInvoice

    if not case_id:
        return
    service_actor = service_member(request, actor.organization_id, "services.work")
    case = case_record(service_actor, case_id, lock=True)
    if (
        case.patient_id != invoice.patient_id
        or case.branch_id != invoice.branch_id
        or case.status == "cancelled"
    ):
        raise DomainError("INVALID_INPUT", "Choose this patient's active service.")
    if not invoice.lines.filter(
        service_source__service_id=case.service_id,
        service_source__service_version=case.service_version,
    ).exists():
        raise DomainError("INVALID_INPUT", "Include the service charge captured for this workflow.")
    old = ServiceCaseInvoice.objects.filter(case=case).first()
    if old and old.invoice_id != invoice.id:
        raise DomainError("CONFLICT", "This service already has an invoice.", 409)
    ServiceCaseInvoice.objects.get_or_create(case=case, defaults={"invoice": invoice})
