from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.analytics.queries import clinic_insights


@strawberry.type
class AnalyticsQuery:
    @strawberry.field
    def clinic_insights(
        self, info: Info, organization_id: UUID, branch_id: UUID, days: int = 30
    ) -> JSON:
        return clinic_insights(info.context, organization_id, branch_id, days)
