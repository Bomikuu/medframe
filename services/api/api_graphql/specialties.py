from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.providers.specialties import save_specialties, specialty_setup


@strawberry.type
class SpecialtiesQuery:
    @strawberry.field
    def clinic_specialties(self, info: Info, organization_id: UUID) -> JSON:
        return specialty_setup(info.context, organization_id)


@strawberry.type
class SpecialtiesMutation:
    @strawberry.mutation
    def save_clinic_specialties(
        self,
        info: Info,
        organization_id: UUID,
        codes: list[str],
        expected_version: int,
        request_id: UUID,
    ) -> JSON:
        return save_specialties(info.context, organization_id, codes, expected_version, request_id)
