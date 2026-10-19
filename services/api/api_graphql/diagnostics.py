from uuid import UUID

import strawberry
from django.db import transaction
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.diagnostics.files import authorize_diagnostic_download, begin_result_upload
from medframe_apps.diagnostics.partnerships import partnership_action
from medframe_apps.diagnostics.policy import get_request
from medframe_apps.diagnostics.queries import (
    diagnostic_setup,
    request_detail,
    request_history,
    request_page,
    row_summary,
)
from medframe_apps.diagnostics.services import diagnostic_action, sharing_preview


@strawberry.type
class DiagnosticsQuery:
    @strawberry.field
    def diagnostic_setup(
        self, info: Info, organization_id: UUID, search: str = "", patient_id: UUID | None = None
    ) -> JSON:
        return diagnostic_setup(info.context, organization_id, search, patient_id)

    @strawberry.field
    def diagnostic_requests(
        self,
        info: Info,
        organization_id: UUID,
        context: str = "clinic",
        filters: JSON | None = None,
        after: str | None = None,
        patient_id: UUID | None = None,
    ) -> JSON:
        return request_page(
            info.context,
            organization_id,
            context=context,
            filters=filters,
            after=after,
            patient_id=patient_id,
        )

    @strawberry.field
    def diagnostic_request(
        self, info: Info, organization_id: UUID, request_id: UUID, context: str = "clinic"
    ) -> JSON:
        return request_detail(info.context, organization_id, request_id, context=context)

    @strawberry.field
    def diagnostic_history(
        self,
        info: Info,
        organization_id: UUID,
        request_id: UUID,
        context: str = "clinic",
        kind: str = "events",
        after: str | None = None,
    ) -> JSON:
        return request_history(
            info.context, organization_id, request_id, context=context, kind=kind, after=after
        )

    @strawberry.field
    def diagnostic_preview(self, info: Info, organization_id: UUID, request_id: UUID) -> JSON:
        with transaction.atomic():
            row = get_request(
                info.context, organization_id, request_id, context="clinic", lock=True
            )
            return sharing_preview(row)


@strawberry.type
class DiagnosticsMutation:
    @strawberry.mutation
    def diagnostic_action(
        self, info: Info, organization_id: UUID, action: str, data: JSON, request_id: UUID
    ) -> JSON:
        return row_summary(
            diagnostic_action(info.context, organization_id, action, data, request_id)
        )

    @strawberry.mutation
    def diagnostic_partnership_action(
        self, info: Info, organization_id: UUID, action: str, data: JSON, request_id: UUID
    ) -> JSON:
        row = partnership_action(info.context, organization_id, action, data, request_id)
        return {"id": str(row.id), "version": row.version, "active": row.active}

    @strawberry.mutation
    def begin_diagnostic_upload(
        self,
        info: Info,
        organization_id: UUID,
        diagnostic_request_id: UUID,
        metadata: JSON,
        request_id: UUID,
    ) -> JSON:
        row = begin_result_upload(
            info.context, organization_id, diagnostic_request_id, metadata, request_id
        )
        return {"id": str(row.id), "scan_state": row.scan_state}

    @strawberry.mutation
    def authorize_diagnostic_download(
        self, info: Info, organization_id: UUID, request_id: UUID, version_id: UUID, context: str
    ) -> str:
        return authorize_diagnostic_download(
            info.context, organization_id, request_id, version_id, context=context
        )
