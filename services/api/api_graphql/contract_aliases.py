"""Django Edition operation names, sharing the same authorized implementations."""

from uuid import UUID

import strawberry
from django.db import transaction
from strawberry.scalars import JSON
from strawberry.types import Info

from api_graphql.clinical import ClinicalQuery, plan_details
from api_graphql.clinical_types import (
    DocumentType,
    EncounterType,
    document_details,
    encounter_details,
)
from api_graphql.patient_types import PatientDemographics, PatientPage, PatientTimelinePage
from api_graphql.patients import PatientQuery
from config.errors import DomainError
from medframe_apps.documents.services import begin_document_upload
from medframe_apps.encounters import services
from medframe_apps.treatments.services import add_treatment_item, update_treatment_item


@strawberry.type
class ContractQuery:
    @strawberry.field
    def patients(
        self,
        info: Info,
        organization_id: UUID,
        query: str = "",
        first: int = 20,
        after: UUID | None = None,
    ) -> PatientPage:
        return PatientQuery.clinic_patients(self, info, organization_id, query, first, after)

    @strawberry.field
    def patient(self, info: Info, organization_id: UUID, patient_id: UUID) -> PatientDemographics:
        return PatientQuery.patient_demographics(self, info, organization_id, patient_id)

    @strawberry.field
    def patient_history(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        first: int = 20,
        after: str | None = None,
    ) -> PatientTimelinePage:
        return PatientQuery.patient_timeline(self, info, organization_id, patient_id, first, after)

    @strawberry.field
    def medical_documents(
        self, info: Info, organization_id: UUID, patient_id: UUID, first: int = 20
    ) -> list[DocumentType]:
        return ClinicalQuery.documents(self, info, organization_id, patient_id, "clinical", first)


@strawberry.type
class ContractMutation:
    @strawberry.mutation
    def amend_encounter(
        self,
        info: Info,
        organization_id: UUID,
        encounter_id: UUID,
        reason: str,
        expected_finalized_version: int,
    ) -> EncounterType:
        return encounter_details(
            services.create_encounter_amendment(
                info.context.user, organization_id, encounter_id, reason, expected_finalized_version
            )
        )

    @strawberry.mutation
    @transaction.atomic
    def add_clinical_note(
        self,
        info: Info,
        organization_id: UUID,
        encounter_id: UUID,
        section: str,
        text: str,
        expected_version: int,
    ) -> EncounterType:
        encounter = services.require_encounter(
            info.context.user, organization_id, encounter_id, write=True
        )
        if section not in {"subjective", "objective", "assessment", "plan"}:
            raise DomainError("INVALID_INPUT", "Choose a SOAP note section.")
        from copy import deepcopy

        content = deepcopy(encounter.draft.content)
        content["soap"][section] = text
        return encounter_details(
            services.save_encounter_draft(
                info.context.user, organization_id, encounter_id, content, expected_version
            )
        )

    @strawberry.mutation
    @transaction.atomic
    def update_dental_chart(
        self,
        info: Info,
        organization_id: UUID,
        encounter_id: UUID,
        findings: JSON,
        expected_version: int,
    ) -> EncounterType:
        encounter = services.require_encounter(
            info.context.user, organization_id, encounter_id, write=True
        )
        content = dict(encounter.draft.content)
        content["findings"] = findings
        return encounter_details(
            services.save_encounter_draft(
                info.context.user, organization_id, encounter_id, content, expected_version
            )
        )

    @strawberry.mutation
    def add_treatment_item(
        self,
        info: Info,
        organization_id: UUID,
        plan_id: UUID,
        data: JSON,
        expected_version: int,
        request_id: UUID | None = None,
    ) -> JSON:
        return plan_details(
            add_treatment_item(
                info.context.user, organization_id, plan_id, data, expected_version, request_id
            )
        )

    @strawberry.mutation
    def update_treatment_status(
        self,
        info: Info,
        organization_id: UUID,
        plan_id: UUID,
        item_id: UUID,
        status: str,
        expected_version: int,
        completed_revision_id: UUID | None = None,
        request_id: UUID | None = None,
    ) -> JSON:
        return plan_details(
            update_treatment_item(
                info.context.user,
                organization_id,
                plan_id,
                item_id,
                status,
                expected_version,
                completed_revision_id,
                request_id,
            )
        )

    @strawberry.mutation
    def upload_medical_document(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        metadata: JSON,
        encounter_id: UUID | None = None,
    ) -> DocumentType:
        return document_details(
            begin_document_upload(
                info.context.user, organization_id, patient_id, encounter_id, "clinical", metadata
            )
        )
