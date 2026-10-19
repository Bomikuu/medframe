from uuid import UUID, uuid4

from django.core import signing
from django.db import transaction

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.diagnostics.models import (
    RequestAttachment,
    ResultAttachment,
    ResultDraft,
    ResultDraftAttachment,
)
from medframe_apps.diagnostics.policy import get_request, unavailable
from medframe_apps.documents.models import Document, DocumentVersion
from medframe_apps.documents.storage import receive_version_bytes, validate_upload_metadata
from medframe_apps.idempotency import record_request_result, replay_request


@transaction.atomic
def begin_result_upload(request, organization_id, request_id, metadata, request_id_key):
    row = get_request(request, organization_id, request_id, context="center", lock=True)
    if row.state != "performed":
        raise DomainError(
            "CONFLICT", "Record the examination or start a correction before uploading.", 409
        )
    values = validate_upload_metadata("diagnostic", metadata)
    previous = replay_request(
        request.user,
        organization_id,
        "diagnostic.upload",
        request_id_key,
        {"request": str(row.id), "metadata": metadata},
    )
    if previous:
        return DocumentVersion.objects.get(id=previous)
    draft, _ = ResultDraft.objects.get_or_create(assignment=row.assignment)
    if draft.attachments.count() >= 20:
        raise DomainError("INVALID_INPUT", "A result supports at most 20 files.")
    document = Document.objects.create(
        organization_id=row.organization_id,
        patient_id=row.patient_id,
        uploaded_by=request.user,
        purpose="diagnostic",
        label=values.pop("label"),
    )
    version = DocumentVersion.objects.create(
        document=document,
        uploaded_by=request.user,
        key=f"private/{row.organization_id}/{uuid4().hex}",
        **values,
    )
    ResultDraftAttachment.objects.create(draft=draft, version=version)
    record_request_result(
        request.user,
        organization_id,
        "diagnostic.upload",
        request_id_key,
        {"request": str(row.id), "metadata": metadata},
        version.id,
    )
    audit(request.user, "diagnostic.upload.started", row.organization_id, version.id)
    return version


@transaction.atomic
def complete_result_upload(request, organization_id, version_id, uploaded_file):
    item = (
        ResultDraftAttachment.objects.select_related("draft__assignment")
        .filter(version_id=version_id)
        .first()
    )
    if item is None:
        raise unavailable()
    row = get_request(
        request, organization_id, item.draft.assignment.request_id, context="center", lock=True
    )
    if row.state != "performed" or row.assignment_id != item.draft.assignment_id:
        raise unavailable()
    version = (
        DocumentVersion.objects.select_for_update().select_related("document").get(id=version_id)
    )
    if version.uploaded_by_id != request.user.id:
        raise unavailable()
    receive_version_bytes(version, uploaded_file)
    audit(request.user, "diagnostic.upload.received", row.organization_id, version.id)
    return version


def scoped_file(request, organization_id, request_id, version_id, context):
    row = get_request(request, organization_id, request_id, context=context, lock=True)
    shared = RequestAttachment.objects.filter(request=row, version_id=version_id).exists()
    result = ResultAttachment.objects.filter(result__request=row, version_id=version_id)
    if context == "center":
        result = result.filter(result__assignment_id=row.assignment_id)
    draft = (
        ResultDraftAttachment.objects.filter(
            draft__assignment_id=row.assignment_id, version_id=version_id
        ).exists()
        if context == "center"
        else False
    )
    if not shared and not result.exists() and not draft:
        raise unavailable()
    version = (
        DocumentVersion.objects.select_related("document")
        .filter(
            id=version_id,
            document__organization_id=row.organization_id,
            document__patient_id=row.patient_id,
            scan_state="clean",
        )
        .first()
    )
    if version is None:
        raise DomainError("UNSAFE_DOCUMENT", "This file is not cleared for download.", 409)
    return row, version


@transaction.atomic
def authorize_diagnostic_download(request, organization_id, request_id, version_id, *, context):
    row, version = scoped_file(request, organization_id, request_id, version_id, context)
    return signing.dumps(
        {
            "user": str(request.user.id),
            "organization": str(organization_id),
            "request": str(row.id),
            "assignment": str(row.assignment_id),
            "version": str(version.id),
            "context": context,
        },
        salt="diagnostic-file",
    )


@transaction.atomic
def redeem_ticket(request, value):
    try:
        ticket = signing.loads(value, salt="diagnostic-file", max_age=60)
        if ticket["user"] != str(request.user.id):
            raise ValueError()
        row, version = scoped_file(
            request,
            UUID(ticket["organization"]),
            UUID(ticket["request"]),
            UUID(ticket["version"]),
            ticket["context"],
        )
        if ticket["context"] == "center" and ticket["assignment"] != str(row.assignment_id):
            raise ValueError()
    except (signing.BadSignature, ValueError, KeyError):
        raise DomainError(
            "EXPIRED_DOWNLOAD", "This file link is unavailable. Request a new one.", 403
        ) from None
    audit(request.user, "diagnostic.file.download", row.organization_id, version.id)
    return version
