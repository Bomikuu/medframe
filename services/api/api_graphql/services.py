from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.services.cases import case_action
from medframe_apps.services.catalog import catalog_action
from medframe_apps.services.queries import case_detail, case_page, catalog_page


@strawberry.type
class ServicesQuery:
    @strawberry.field
    def service_patients(
        self, info: Info, organization_id: UUID, branch_id: UUID, search: str = ""
    ) -> JSON:
        from medframe_apps.services.queries import service_patients

        return service_patients(info.context, organization_id, branch_id, search)

    @strawberry.field
    def service_catalog(
        self,
        info: Info,
        organization_id: UUID,
        branch_id: UUID,
        filters: JSON | None = None,
        after: str | None = None,
    ) -> JSON:
        return catalog_page(info.context, organization_id, branch_id, filters, after)

    @strawberry.field
    def patient_services(
        self,
        info: Info,
        organization_id: UUID,
        branch_id: UUID,
        filters: JSON | None = None,
        patient_id: UUID | None = None,
        after: str | None = None,
    ) -> JSON:
        return case_page(info.context, organization_id, branch_id, filters, patient_id, after)

    @strawberry.field
    def patient_service(self, info: Info, organization_id: UUID, case_id: UUID) -> JSON:
        return case_detail(info.context, organization_id, case_id)


@strawberry.type
class ServicesMutation:
    @strawberry.mutation
    def service_action(
        self, info: Info, organization_id: UUID, action: str, data: JSON, request_id: UUID
    ) -> JSON:
        return catalog_action(info.context, organization_id, action, data, request_id)

    @strawberry.mutation
    def patient_service_action(
        self, info: Info, organization_id: UUID, action: str, data: JSON, request_id: UUID
    ) -> JSON:
        return case_action(info.context, organization_id, action, data, request_id)
