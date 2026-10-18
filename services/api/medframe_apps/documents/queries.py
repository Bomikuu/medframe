from django.db import transaction

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.documents.models import DocumentVersion
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.services import require_patient
from medframe_apps.record_filters import filter_dates, page_records, parse_filters


def document_summary(item):
    return {
        "id": str(item.id),
        "document_id": str(item.document_id),
        "label": item.document.label,
        "version": item.version,
        "content_type": item.content_type,
        "size": item.size,
        "scan_state": item.scan_state,
        "created_at": item.created_at.isoformat(),
        "encounter_id": str(item.document.encounter_id) if item.document.encounter_id else None,
    }


@transaction.atomic
def list_documents(user, organization_id, patient_id, filters=None, after=None, first=20):
    require_patient(user, organization_id, patient_id, "patients.clinical.read")
    member = require_membership(user, organization_id, "patients.clinical.read")
    parsed = parse_filters(filters)
    if (
        parsed.status not in {None, "uploading", "pending", "unavailable", "clean", "rejected"}
        or parsed.tooth
    ):
        raise DomainError("INVALID_INPUT", "Choose valid document filters.")
    if parsed.type not in {
        None,
        "image",
        "pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
    }:
        raise DomainError("INVALID_INPUT", "Choose a supported document type.")
    query = DocumentVersion.objects.filter(
        document__organization_id=organization_id,
        document__patient_id=patient_id,
        document__purpose="clinical",
    ).select_related("document")
    if parsed.query:
        query = query.filter(document__label__icontains=parsed.query)
    if parsed.status:
        query = query.filter(scan_state=parsed.status)
    if parsed.type == "image":
        query = query.filter(content_type__startswith="image/")
    elif parsed.type:
        query = query.filter(
            content_type="application/pdf" if parsed.type == "pdf" else parsed.type
        )
    if parsed.author_id:
        query = query.filter(uploaded_by_id=parsed.author_id)
    query = filter_dates(query, parsed, member.organization.timezone)
    audit(user, "documents.filtered", organization_id, patient_id)
    return page_records(
        query,
        scope=f"documents:{organization_id}:{patient_id}:{user.id}",
        filters=parsed,
        after=after,
        first=first,
        serialize=document_summary,
    )
