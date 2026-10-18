from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.dental import history


@strawberry.type
class DentalHistoryQuery:
    @strawberry.field
    def chart_revisions(
        self, info: Info, organization_id: UUID, patient_id: UUID, after: str | None = None
    ) -> JSON:
        return history.chart_revisions(info.context.user, organization_id, patient_id, after)

    @strawberry.field
    def dental_comparison(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        left_revision_id: UUID,
        right_revision_id: UUID | None = None,
    ) -> JSON:
        return history.compare_dental_charts(
            info.context.user, organization_id, patient_id, left_revision_id, right_revision_id
        )

    @strawberry.field
    def tooth_evidence(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        tooth: str,
        after: str | None = None,
    ) -> JSON:
        return history.tooth_evidence(info.context.user, organization_id, patient_id, tooth, after)
