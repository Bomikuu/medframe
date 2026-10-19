from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.websites import services


@strawberry.type
class WebsiteQuery:
    @strawberry.field
    def website_setup(self, info: Info, organization_id: UUID) -> JSON:
        return services.setup(info.context, organization_id)


@strawberry.type
class WebsiteMutation:
    @strawberry.mutation
    def website_action(
        self, info: Info, organization_id: UUID, action: str, data: JSON, expected_version: int
    ) -> JSON:
        return services.action(info.context, organization_id, action, data, expected_version)
