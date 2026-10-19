from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.diagnostics.portal import (
    patient_request_detail,
    patient_request_page,
    patient_select_center,
)


@strawberry.type
class PortalDiagnosticsQuery:
    @strawberry.field
    def my_diagnostic_requests(self, info: Info, link_id: UUID, after: str | None = None) -> JSON:
        return patient_request_page(info.context, link_id, after)

    @strawberry.field
    def my_diagnostic_request(self, info: Info, link_id: UUID, request_id: UUID) -> JSON:
        return patient_request_detail(info.context, link_id, request_id)


@strawberry.type
class PortalDiagnosticsMutation:
    @strawberry.mutation
    def select_diagnostic_center(
        self,
        info: Info,
        link_id: UUID,
        diagnostic_request_id: UUID,
        center_id: UUID,
        expected_version: int,
        request_id: UUID,
    ) -> JSON:
        return patient_select_center(
            info.context, link_id, diagnostic_request_id, center_id, expected_version, request_id
        )
