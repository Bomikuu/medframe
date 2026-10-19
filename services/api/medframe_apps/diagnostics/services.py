from uuid import uuid4

from django.db import transaction
from django.utils import timezone
from pydantic import ValidationError

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version
from medframe_apps.diagnostics.inputs import ActionInput, DraftInput
from medframe_apps.diagnostics.models import (
    DiagnosticAssignment,
    DiagnosticEvent,
    DiagnosticRequest,
    RequestAttachment,
    RequestRevision,
)
from medframe_apps.diagnostics.partnerships import eligible_centers
from medframe_apps.diagnostics.policy import (
    clinic_reader,
    diagnostic_lock,
    get_request,
    unavailable,
)
from medframe_apps.documents.models import DocumentVersion
from medframe_apps.encounters.models import Encounter
from medframe_apps.idempotency import record_request_result, replay_request, request_digest
from medframe_apps.providers.models import ProviderProfile

CENTER_ACTIONS = {
    "accept",
    "decline",
    "performed",
    "save_result",
    "submit_result",
    "start_correction",
}


def parsed(schema, data):
    try:
        return schema.model_validate(data)
    except ValidationError:
        raise DomainError(
            "INVALID_INPUT", "Check the diagnostic fields, lengths and dates."
        ) from None


def event(request, row, action, reason=""):
    DiagnosticEvent.objects.create(
        request=row, actor=request.user, action=action, reason=reason, version=row.version
    )
    audit(request.user, "diagnostic." + action, row.organization_id, row.id)


def sharing_preview(row):
    patient = row.patient
    files = list(
        RequestAttachment.objects.filter(request=row)
        .select_related("version__document")
        .order_by("created_at")[:21]
    )
    if len(files) > 20 or any(item.version.scan_state != "clean" for item in files):
        raise DomainError("UNSAFE_DOCUMENT", "Select at most 20 clean file versions.", 409)
    package = {
        "identity": {
            "name": patient.full_name,
            "reference": patient.reference,
            "date_of_birth": str(patient.date_of_birth) if patient.date_of_birth else None,
            "sex": patient.sex,
        },
        "details": row.details,
        "files": [
            {
                "id": str(item.version_id),
                "label": item.version.document.label,
                "filename": item.version.filename,
                "content_type": item.version.content_type,
                "sha256": item.version.sha256,
            }
            for item in files
        ],
    }
    return {
        "package": package,
        "digest": request_digest({"package": package, "version": row.version}),
    }


def save_draft(request, organization_id, data):
    member, patient = clinic_reader(request, organization_id, data.patient_id, write=True)
    if (
        data.encounter_id
        and not Encounter.objects.filter(
            id=data.encounter_id,
            patient=patient,
            organization_id=organization_id,
            branch_id=patient.branch_id,
        ).exists()
    ):
        raise unavailable()
    if data.id:
        row = get_request(request, organization_id, data.id, context="clinic", lock=True)
        check_version(row.version, data.expected_version)
        if (
            row.state != "draft"
            or row.patient_id != patient.id
            or row.encounter_id != data.encounter_id
        ):
            raise DomainError(
                "CONFLICT",
                "Only a draft with the same patient and consultation can be edited.",
                409,
            )
        row.version += 1
    else:
        check_version(0, data.expected_version)
        row = DiagnosticRequest(
            organization_id=organization_id,
            patient=patient,
            branch_id=patient.branch_id,
            encounter_id=data.encounter_id,
            provider=ProviderProfile.objects.get(membership=member),
            number="DX-" + uuid4().hex[:12].upper(),
        )
    ids = data.document_version_ids
    versions = list(
        DocumentVersion.objects.filter(
            id__in=ids,
            document__organization_id=organization_id,
            document__patient=patient,
            document__purpose="clinical",
            scan_state="clean",
        )
    )
    if len(versions) != len(ids) or len(set(ids)) != len(ids):
        raise DomainError("INVALID_SOURCE", "Select distinct clean files for this patient.", 409)
    row.details = data.model_dump(
        mode="json",
        exclude={"id", "patient_id", "encounter_id", "expected_version", "document_version_ids"},
    )
    row.save()
    RequestAttachment.objects.filter(request=row).delete()
    RequestAttachment.objects.bulk_create(
        [RequestAttachment(request=row, version=item) for item in versions]
    )
    return row


def select_center(request, row, center_id, reason=""):
    if row.state not in {"awaiting_center", "sent"} or not row.sharing:
        raise DomainError(
            "CONFLICT", "Center selection is unavailable after acceptance or withdrawal.", 409
        )
    center = eligible_centers(row).filter(id=center_id).first()
    if center is None:
        raise unavailable()
    partnership = center.diagnosticpartnership_set.get(organization_id=row.organization_id)
    if row.assignment_id:
        DiagnosticAssignment.objects.filter(id=row.assignment_id).update(active=False)
    row.assignment = DiagnosticAssignment.objects.create(
        request=row, partnership=partnership, actor=request.user, reason=reason
    )
    row.state = "sent"


def transition(request, row, action, data):
    if action == "issue":
        if row.state != "draft":
            raise DomainError("CONFLICT", "Only a draft can be issued.", 409)
        preview = sharing_preview(row)
        if preview["digest"] != data.preview_digest:
            raise DomainError(
                "CONFLICT", "Sharing details changed. Preview again before issuing.", 409
            )
        row.package = preview["package"]
        row.state = "awaiting_center"
        RequestRevision.objects.create(request=row, actor=request.user, snapshot=row.package)
    elif action == "assisted_select":
        if not data.reason:
            raise DomainError("INVALID_INPUT", "Record why center selection was assisted.")
        select_center(request, row, data.center_id, data.reason)
    elif action == "accept":
        if row.state != "sent":
            raise DomainError("CONFLICT", "Only a sent request can be accepted.", 409)
        row.assignment.accepted_at = timezone.now()
        row.assignment.save(update_fields=["accepted_at"])
        row.state = "accepted"
    elif action == "performed":
        if (
            row.state != "accepted"
            or not data.performed_at
            or timezone.is_naive(data.performed_at)
            or not row.assignment.accepted_at <= data.performed_at <= timezone.now()
        ):
            raise DomainError(
                "INVALID_INPUT", "Record an examination time between acceptance and now."
            )
        row.assignment.performed_at = data.performed_at
        row.assignment.save(update_fields=["performed_at"])
        row.state = "performed"
    elif action in {"decline", "recall", "cancel"}:
        permitted = {
            "decline": {"sent"},
            "recall": {"sent", "accepted", "performed"},
            "cancel": {"draft", "awaiting_center", "sent", "accepted", "performed"},
        }
        if not data.reason or row.state not in permitted[action] or row.current_result_id:
            raise DomainError("CONFLICT", "Give a reason for an eligible unsubmitted request.", 409)
        if row.assignment_id:
            DiagnosticAssignment.objects.filter(id=row.assignment_id).update(active=False)
        row.assignment = None
        row.state = "cancelled" if action == "cancel" else "awaiting_center"
    elif action in {"withdraw_sharing", "resume_sharing"}:
        if not data.reason or row.state in {"draft", "cancelled"}:
            raise DomainError("INVALID_INPUT", "Give a reason for an issued request.")
        if action == "resume_sharing" and (
            not row.assignment_id
            or not row.assignment.active
            or not row.assignment.partnership.active
            or not row.assignment.partnership.center.organization.active
        ):
            raise unavailable()
        row.sharing = action == "resume_sharing"
    else:
        from medframe_apps.diagnostics.results import result_action

        result_action(request, row, action, data)


@transaction.atomic
def diagnostic_action(request, organization_id, action, data, request_id):
    if action == "save_draft":
        value = parsed(DraftInput, data)
        diagnostic_lock(organization_id)
        clinic_reader(request, organization_id, value.patient_id, write=True)
        if value.id:
            get_request(request, organization_id, value.id, context="clinic", lock=True)
        previous = replay_request(
            request.user, organization_id, "diagnostic." + action, request_id, data
        )
        if previous:
            return get_request(request, organization_id, previous, context="clinic")
        row = save_draft(request, organization_id, value)
    else:
        value = parsed(ActionInput, data)
        context = "center" if action in CENTER_ACTIONS else "clinic"
        row = get_request(request, organization_id, value.id, context=context, lock=True)
        if context == "clinic":
            clinic_reader(
                request,
                organization_id,
                row.patient_id,
                write=True,
                permission="diagnostics.review" if action == "review" else "diagnostics.request",
            )
        previous = replay_request(
            request.user, organization_id, "diagnostic." + action, request_id, data
        )
        if previous:
            return get_request(request, organization_id, previous, context=context)
        check_version(row.version, value.expected_version)
        transition(request, row, action, value)
        row.version += 1
        row.save()
    record_request_result(
        request.user, organization_id, "diagnostic." + action, request_id, data, row.id
    )
    event(request, row, action, getattr(value, "reason", ""))
    return row
