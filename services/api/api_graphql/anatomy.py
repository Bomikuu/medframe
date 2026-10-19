from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.anatomy import history
from medframe_apps.anatomy.reference import anatomy_reference
from medframe_apps.organizations.policy import require_membership


@strawberry.type
class AnatomyQuery:
    @strawberry.field
    def anatomy_reference(self, info: Info, organization_id: UUID) -> JSON:
        require_membership(info.context.user, organization_id, "workspace.read")
        return anatomy_reference()

    @strawberry.field
    def anatomy_chart(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        revision_id: UUID | None = None,
        filters: JSON | None = None,
        after: str | None = None,
        first: int = 20,
    ) -> JSON:
        return history.read_anatomy_chart(
            info.context.user,
            organization_id,
            patient_id,
            revision_id=revision_id,
            filters=filters,
            after=after,
            first=first,
        )

    @strawberry.field
    def anatomy_revisions(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        after: str | None = None,
        first: int = 20,
    ) -> JSON:
        return history.anatomy_revisions(
            info.context.user, organization_id, patient_id, after, first
        )

    @strawberry.field
    def anatomy_comparison(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        left_revision_id: UUID,
        right_revision_id: UUID,
        after: str | None = None,
        first: int = 20,
    ) -> JSON:
        return history.compare_anatomy_charts(
            info.context.user,
            organization_id,
            patient_id,
            left_revision_id,
            right_revision_id,
            after,
            first,
        )
