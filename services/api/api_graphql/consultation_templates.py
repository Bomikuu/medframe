from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from api_graphql.clinical_types import EncounterType, encounter_details
from medframe_apps.encounters.models import TemplateRevision
from medframe_apps.encounters.templates import apply_template, save_template, template_details
from medframe_apps.organizations.policy import require_membership
from medframe_apps.record_filters import page_records


@strawberry.type
class TemplateQuery:
    @strawberry.field
    def consultation_templates(
        self,
        info: Info,
        organization_id: UUID,
        include_archived: bool = False,
        after: str | None = None,
        specialty: str | None = None,
    ) -> JSON:
        require_membership(info.context.user, organization_id, "encounters.write")
        from django.db.models import F

        query = TemplateRevision.objects.select_related("template").filter(
            organization_id=organization_id, version=F("template__version")
        )
        if not include_archived:
            query = query.filter(template__active=True)
        if specialty:
            query = query.filter(template__specialty=specialty)
        return page_records(
            query,
            scope=f"templates:{organization_id}:{include_archived}:{specialty or ''}",
            after=after,
            serialize=template_details,
        )


@strawberry.type
class TemplateMutation:
    @strawberry.mutation
    def save_consultation_template(
        self, info: Info, organization_id: UUID, data: JSON, expected_version: int, request_id: UUID
    ) -> JSON:
        template = save_template(
            info.context.user, organization_id, data, expected_version, request_id
        )
        return template_details(
            template.revisions.select_related("template").get(version=template.version)
        )

    @strawberry.mutation
    def apply_consultation_template(
        self,
        info: Info,
        organization_id: UUID,
        encounter_id: UUID,
        template_revision_id: UUID,
        expected_version: int,
        request_id: UUID,
    ) -> EncounterType:
        return encounter_details(
            apply_template(
                info.context.user,
                organization_id,
                encounter_id,
                template_revision_id,
                expected_version,
                request_id,
            )
        )
