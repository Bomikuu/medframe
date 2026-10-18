from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.documents.queries import list_documents
from medframe_apps.encounters.queries import list_encounters
from medframe_apps.patients.queries import list_patient_events


@strawberry.type
class RecordQuery:
    @strawberry.field
    def record_authors(
        self, info: Info, organization_id: UUID, patient_id: UUID | None = None
    ) -> JSON:
        from medframe_apps.record_authors import record_authors

        return record_authors(info.context.user, organization_id, patient_id)

    @strawberry.field
    def consultation_records(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID | None = None,
        filters: JSON | None = None,
        after: str | None = None,
    ) -> JSON:
        return list_encounters(info.context.user, organization_id, patient_id, filters, after)

    @strawberry.field
    def document_records(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        filters: JSON | None = None,
        after: str | None = None,
    ) -> JSON:
        return list_documents(info.context.user, organization_id, patient_id, filters, after)

    @strawberry.field
    def history_records(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        filters: JSON | None = None,
        after: str | None = None,
    ) -> JSON:
        return list_patient_events(info.context.user, organization_id, patient_id, filters, after)
