from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.communications.actions import communication_action
from medframe_apps.communications.queries import communication_page, communication_setup


@strawberry.type
class CommunicationsQuery:
    @strawberry.field
    def communication_setup(
        self,
        info: Info,
        organization_id: UUID,
        branch_id: UUID,
        patient_id: UUID | None = None,
        search: str = "",
    ) -> JSON:
        return communication_setup(info.context, organization_id, branch_id, patient_id, search)

    @strawberry.field
    def communication_reminders(
        self,
        info: Info,
        organization_id: UUID,
        branch_id: UUID,
        filters: JSON | None = None,
        after: str | None = None,
    ) -> JSON:
        return communication_page(info.context, organization_id, branch_id, filters, after)


@strawberry.type
class CommunicationsMutation:
    @strawberry.mutation
    def communication_action(
        self, info: Info, organization_id: UUID, action: str, data: JSON, request_id: UUID
    ) -> JSON:
        return communication_action(info.context, organization_id, action, data, request_id)
