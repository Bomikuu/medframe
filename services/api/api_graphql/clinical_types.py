from datetime import datetime
from uuid import UUID

import strawberry
from strawberry.scalars import JSON


@strawberry.type
class ProviderType:
    id: UUID
    display_name: str
    specialty: str
    branch_id: UUID | None


@strawberry.type
class RevisionType:
    id: UUID
    version: int
    author_name: str
    created_at: datetime
    amendment_reason: str


@strawberry.type
class EncounterType:
    id: UUID
    patient_id: UUID
    patient_name: str
    branch_id: UUID
    reason: str
    status: str
    version: int
    created_at: datetime
    updated_at: datetime
    content: JSON
    is_amendment: bool
    amendment_reason: str
    latest_finalized_version: int
    revision_id: UUID | None
    editable: bool
    revisions: list[RevisionType]
    patient_history_revision_id: UUID | None


def encounter_details(encounter, exact_revision=None):
    from medframe_apps.encounters.services import editable

    revisions = getattr(encounter, "loaded_revisions", None)
    if revisions is None:
        revisions = list(encounter.revisions.select_related("author").order_by("-version")[:20])
    latest = revisions[0] if revisions else None
    draft = encounter.draft
    return EncounterType(
        id=encounter.id,
        patient_id=encounter.patient_id,
        patient_name=encounter.patient.full_name,
        branch_id=encounter.branch_id,
        reason=encounter.reason,
        status=("amended" if latest and latest.version > 1 else encounter.status),
        version=encounter.version,
        created_at=encounter.created_at,
        updated_at=encounter.updated_at,
        content=exact_revision.content if exact_revision else draft.content,
        is_amendment=draft.is_amendment if exact_revision is None else False,
        amendment_reason=exact_revision.amendment_reason
        if exact_revision
        else draft.amendment_reason,
        latest_finalized_version=latest.version if latest else 0,
        revision_id=exact_revision.id
        if exact_revision
        else latest.id
        if latest and not draft.is_amendment
        else None,
        editable=editable(encounter) and exact_revision is None,
        revisions=[
            RevisionType(
                id=item.id,
                version=item.version,
                author_name=item.author.display_name,
                created_at=item.created_at,
                amendment_reason=item.amendment_reason,
            )
            for item in revisions
        ],
        patient_history_revision_id=(exact_revision or latest)
        .content.get("context", {})
        .get("history_revision_id")
        if exact_revision or latest and not draft.is_amendment
        else None,
    )


@strawberry.type
class DocumentType:
    id: UUID
    document_id: UUID
    label: str
    version: int
    content_type: str
    size: int
    scan_state: str
    created_at: datetime
    encounter_id: UUID | None


def document_details(version):
    return DocumentType(
        id=version.id,
        document_id=version.document_id,
        label=version.document.label,
        version=version.version,
        content_type=version.content_type,
        size=version.size,
        scan_state=version.scan_state,
        created_at=version.created_at,
        encounter_id=version.document.encounter_id,
    )
