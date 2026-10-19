from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone
from pydantic import ValidationError

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.billing.calculations import draft_totals, money
from medframe_apps.billing.inputs import ActionInput, DraftInput
from medframe_apps.billing.models import BillingSettings, FinancialEvent, Invoice, InvoiceLine
from medframe_apps.billing.payments import record_financial_action
from medframe_apps.billing.policy import financial_patient, get_invoice, staff_member
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.patients.services import require_patient


def validate_input(schema, data):
    try:
        return schema.model_validate(data)
    except ValidationError:
        raise DomainError(
            "INVALID_INPUT", "Check the required fields, amounts and dates."
        ) from None


def source_references(request, member, data):
    if not data.encounter_id and not any(line.procedure_id for line in data.lines):
        return
    from medframe_apps.encounters.models import Encounter
    from medframe_apps.treatments.models import Procedure

    require_patient(request.user, member.organization_id, data.patient_id, "patients.clinical.read")
    if (
        data.encounter_id
        and not Encounter.objects.filter(
            id=data.encounter_id,
            organization_id=member.organization_id,
            patient_id=data.patient_id,
            branch_id=data.branch_id,
        ).exists()
    ):
        raise DomainError("NOT_FOUND", "This consultation is unavailable.", 404)
    for line in data.lines:
        if (
            line.procedure_id
            and not Procedure.objects.filter(
                id=line.procedure_id,
                revision__encounter__organization_id=member.organization_id,
                revision__encounter__patient_id=data.patient_id,
                revision__encounter__branch_id=data.branch_id,
            ).exists()
        ):
            raise DomainError("NOT_FOUND", "This procedure is unavailable.", 404)


def save_draft(request, member, data):
    financial_patient(member, data.branch_id, data.patient_id)
    source_references(request, member, data)
    totals = draft_totals(data.lines, data.discount_kind, data.discount_value)
    if data.id:
        row = get_invoice(member, data.id, lock=True)
        check_version(row.version, data.expected_version)
        if row.state != "draft":
            raise DomainError("CONFLICT", "An issued invoice cannot be edited.", 409)
        if row.patient_id != data.patient_id or row.branch_id != data.branch_id:
            raise DomainError("INVALID_INPUT", "Create a new draft to change patient or branch.")
        row.lines.all().delete()
        row.version += 1
    else:
        check_version(0, data.expected_version)
        row = Invoice(
            organization_id=member.organization_id,
            branch_id=data.branch_id,
            patient_id=data.patient_id,
            created_by=request.user,
        )
    for key, value in {
        "encounter_id": data.encounter_id,
        "due_date": data.due_date,
        "discount_kind": data.discount_kind,
        "discount_value": data.discount_value,
        **totals,
    }.items():
        setattr(row, key, value)
    row.save()
    InvoiceLine.objects.bulk_create(
        [
            InvoiceLine(
                invoice=row,
                position=index,
                description=line.description,
                kind=line.kind,
                quantity=line.quantity,
                unit_amount=money(line.unit_amount),
                procedure_id=line.procedure_id,
            )
            for index, line in enumerate(data.lines)
        ]
    )
    return row


def issue(request, row):
    if row.state != "draft" or not row.total:
        raise DomainError("CONFLICT", "Issue a draft with a positive total.", 409)
    if row.due_date < timezone.localdate(timezone=ZoneInfo(row.organization.timezone)):
        raise DomainError("INVALID_INPUT", "Due date cannot be before issue date.")
    advisory_lock(f"billing-number:{row.organization_id}")
    settings, _ = BillingSettings.objects.get_or_create(organization_id=row.organization_id)
    settings = BillingSettings.objects.select_for_update().get(pk=settings.pk)
    row.number = f"{settings.prefix}-{settings.next_number:06d}"
    row.currency = settings.currency
    row.state = "issued"
    row.issued_by = request.user
    row.issued_at = timezone.now()
    settings.next_number += 1
    settings.save(update_fields=["next_number"])
    return {
        "number": row.number,
        "currency": row.currency,
        "total": row.total,
        "subtotal": row.subtotal,
        "discount": row.discount,
        "lines": list(
            row.lines.order_by("position").values("description", "kind", "quantity", "unit_amount")
        ),
    }


@transaction.atomic
def invoice_action(request, organization_id, action, data, request_id):
    permission = (
        "billing.manage"
        if action in {"save", "issue"}
        else "payments.record"
        if action == "payment"
        else "billing.adjust"
    )
    member = staff_member(request, organization_id, permission)
    parsed = validate_input(DraftInput if action == "save" else ActionInput, data)
    request_data = parsed.model_dump(mode="json")
    # Reauthorization of the target happens before an idempotent response is returned.
    if parsed.id:
        get_invoice(member, parsed.id)
    elif action == "save":
        financial_patient(member, parsed.branch_id, parsed.patient_id)
    previous = replay_request(
        request.user, organization_id, f"billing.{action}", request_id, request_data
    )
    if previous:
        return get_invoice(member, previous)
    reason = ""
    if action == "save":
        row = save_draft(request, member, parsed)
        payload = {"total": row.total}
    else:
        row = get_invoice(member, parsed.id, lock=True)
        check_version(row.version, parsed.expected_version)
        payload = (
            issue(request, row)
            if action == "issue"
            else record_financial_action(request, row, action, parsed)
        )
        reason = parsed.reason
        row.version += 1
        row.save()
    FinancialEvent.objects.create(
        invoice=row,
        actor=request.user,
        kind=action,
        request_key=request_id,
        reason=reason,
        payload=payload,
    )
    record_request_result(
        request.user, organization_id, f"billing.{action}", request_id, request_data, row.id
    )
    audit(request.user, f"billing.{action}", organization_id, row.id)
    if action != "save":
        from medframe_apps.auditing.models import Notification

        Notification.objects.create(
            user=request.user,
            organization_id=organization_id,
            kind="billing_updated",
            resource_id=row.id,
        )
    return row
