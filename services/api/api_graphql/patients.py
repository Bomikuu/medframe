from uuid import UUID

import strawberry
from django.db import transaction
from strawberry.scalars import JSON
from strawberry.types import Info

from api_graphql.patient_types import (
    ClinicalHistory,
    ClinicalRevisionPage,
    PatientAssignee,
    PatientDemographics,
    PatientDirectoryPage,
    PatientPage,
    PatientSummary,
    PatientTimelineEvent,
    PatientTimelinePage,
    RegisterPatientInput,
    SaveClinicalHistoryInput,
    UpdateDemographicsInput,
    clinical_details,
    patient_details,
    patient_summary,
    validated,
)
from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_page
from medframe_apps.organizations.policy import eligible_memberships
from medframe_apps.patients import inputs, services
from medframe_apps.patients.models import PatientAccessGrant, PatientClinicalRevision


@strawberry.type
class PatientQuery:
    @strawberry.field
    def patient_profile_summary(self, info: Info, organization_id: UUID, patient_id: UUID) -> JSON:
        from medframe_apps.patients.profile_summary import profile_summary

        return profile_summary(info.context, organization_id, patient_id)

    @strawberry.field
    @transaction.atomic
    def patient_clinical_context(
        self, info: Info, organization_id: UUID, patient_id: UUID, revision_id: UUID | None = None
    ) -> ClinicalHistory | None:
        services.require_patient(
            info.context.user, organization_id, patient_id, "patients.clinical.read"
        )
        queryset = PatientClinicalRevision.objects.filter(
            patient_id=patient_id, organization_id=organization_id
        ).select_related("author")
        if revision_id:
            queryset = queryset.filter(id=revision_id)
        revision = queryset.order_by("-version").first()
        if revision_id and revision is None:
            raise DomainError("NOT_FOUND", "History revision is unavailable.", 404)
        audit(info.context.user, "patient.clinical_context.read", organization_id, patient_id)
        return clinical_details(revision)

    @strawberry.field
    def clinic_patients(
        self,
        info: Info,
        organization_id: UUID,
        query: str = "",
        first: int = 20,
        after: UUID | None = None,
    ) -> PatientPage:
        items, more, total = services.search_patients(
            info.context.user, organization_id, query, first, after
        )
        return PatientPage(
            items=[patient_summary(item) for item in items],
            end_cursor=items[-1].id if items else None,
            has_next_page=more,
            total_count=total,
        )

    @strawberry.field
    def patient_directory(
        self,
        info: Info,
        organization_id: UUID,
        query: str = "",
        first: int = 20,
        after: str | None = None,
        sort: str = "name_asc",
        branch_id: UUID | None = None,
    ) -> PatientDirectoryPage:
        items, cursor, more, total = services.patient_directory(
            info.context.user, organization_id, query, first, after, sort, branch_id
        )
        return PatientDirectoryPage(
            items=[patient_summary(item) for item in items],
            end_cursor=cursor,
            has_next_page=more,
            total_count=total,
        )

    @strawberry.field
    def recent_patients(self, info: Info, organization_id: UUID) -> list[PatientSummary]:
        return [
            patient_summary(item)
            for item in services.recent_patients(info.context.user, organization_id)
        ]

    @strawberry.field
    @transaction.atomic
    def patient_demographics(
        self, info: Info, organization_id: UUID, patient_id: UUID
    ) -> PatientDemographics:
        patient = services.require_patient(
            info.context.user, organization_id, patient_id, "patients.demographics.read"
        )
        audit(info.context.user, "patient.read", organization_id, patient_id)
        return patient_details(patient)

    @strawberry.field
    @transaction.atomic
    def patient_clinical_history(
        self, info: Info, organization_id: UUID, patient_id: UUID
    ) -> ClinicalHistory | None:
        services.require_patient(
            info.context.user, organization_id, patient_id, "patients.clinical.read"
        )
        revision = (
            PatientClinicalRevision.objects.filter(patient_id=patient_id)
            .select_related("author")
            .order_by("-version")
            .first()
        )
        audit(info.context.user, "patient.clinical.read", organization_id, patient_id)
        return clinical_details(revision)

    @strawberry.field
    @transaction.atomic
    def patient_clinical_revisions(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        first: int = 20,
        after_version: int | None = None,
    ) -> ClinicalRevisionPage:
        check_page(first)
        services.require_patient(
            info.context.user, organization_id, patient_id, "patients.clinical.read"
        )
        queryset = PatientClinicalRevision.objects.filter(patient_id=patient_id).select_related(
            "author"
        )
        if after_version is not None:
            if after_version < 1:
                raise DomainError("INVALID_INPUT", "Use a valid revision cursor.")
            queryset = queryset.filter(version__lt=after_version)
        rows = list(queryset.order_by("-version")[: first + 1])
        items = rows[:first]
        audit(info.context.user, "patient.revisions.read", organization_id, patient_id)
        return ClinicalRevisionPage(
            items=[clinical_details(item) for item in items],
            end_version=items[-1].version if items else None,
            has_next_page=len(rows) > first,
        )

    @strawberry.field
    def patient_timeline(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        first: int = 20,
        after: str | None = None,
    ) -> PatientTimelinePage:
        items, cursor, more = services.patient_timeline(
            info.context.user, organization_id, patient_id, first, after
        )
        return PatientTimelinePage(
            items=[
                PatientTimelineEvent(
                    id=item.id,
                    action=item.action,
                    author_name=item.actor.display_name,
                    created_at=item.created_at,
                    revision_id=item.revision_id,
                    encounter_id=item.encountertimelinelink.revision.encounter_id
                    if hasattr(item, "encountertimelinelink")
                    else None,
                    encounter_revision_id=item.encountertimelinelink.revision_id
                    if hasattr(item, "encountertimelinelink")
                    else None,
                )
                for item in items
            ],
            end_cursor=cursor,
            has_next_page=more,
        )

    @strawberry.field
    @transaction.atomic
    def patient_access_grants(
        self, info: Info, organization_id: UUID, patient_id: UUID
    ) -> list[PatientAssignee]:
        services.require_patient(
            info.context.user, organization_id, patient_id, "patients.access.manage"
        )
        grants = PatientAccessGrant.objects.filter(
            patient_id=patient_id, organization_id=organization_id
        ).select_related("membership__user", "membership__branch")[:50]
        audit(info.context.user, "patient.access.read", organization_id, patient_id)
        return [
            PatientAssignee(**services.assignee(grant.membership, grant.active)) for grant in grants
        ]

    @strawberry.field
    @transaction.atomic
    def eligible_patient_assignees(
        self, info: Info, organization_id: UUID, patient_id: UUID, query: str = "", first: int = 20
    ) -> list[PatientAssignee]:
        check_page(first)
        patient = services.require_patient(
            info.context.user, organization_id, patient_id, "patients.access.manage"
        )
        if len(query) > 160:
            raise DomainError("INVALID_INPUT", "Search must be 160 characters or fewer.")
        members = (
            eligible_memberships(organization_id, patient.branch_id)
            .filter(user__display_name__icontains=query.strip())
            .order_by("user__display_name", "id")[:first]
        )
        audit(info.context.user, "patient.assignees.read", organization_id, patient_id)
        return [PatientAssignee(**services.assignee(member)) for member in members]


@strawberry.type
class PatientMutation:
    @strawberry.mutation
    def register_patient(
        self, info: Info, organization_id: UUID, data: RegisterPatientInput
    ) -> PatientDemographics:
        return patient_details(
            services.register_patient(
                info.context.user, organization_id, validated(inputs.RegisterPatientInput, data)
            )
        )

    @strawberry.mutation
    def update_patient_demographics(
        self, info: Info, organization_id: UUID, patient_id: UUID, data: UpdateDemographicsInput
    ) -> PatientDemographics:
        return patient_details(
            services.update_demographics(
                info.context.user,
                organization_id,
                patient_id,
                validated(inputs.UpdateDemographicsInput, data),
            )
        )

    @strawberry.mutation
    def save_patient_clinical_history(
        self, info: Info, organization_id: UUID, patient_id: UUID, data: SaveClinicalHistoryInput
    ) -> ClinicalHistory:
        return clinical_details(
            services.save_clinical_history(
                info.context.user,
                organization_id,
                patient_id,
                validated(inputs.SaveClinicalHistoryInput, data),
            )
        )

    @strawberry.mutation
    def set_patient_access(
        self, info: Info, organization_id: UUID, patient_id: UUID, membership_id: UUID, active: bool
    ) -> PatientAssignee:
        return PatientAssignee(
            **services.set_patient_access(
                info.context.user, organization_id, patient_id, membership_id, active
            )
        )

    @strawberry.mutation
    def create_patient(
        self, info: Info, organization_id: UUID, data: RegisterPatientInput
    ) -> PatientDemographics:
        return patient_details(
            services.register_patient(
                info.context.user, organization_id, validated(inputs.RegisterPatientInput, data)
            )
        )

    @strawberry.mutation
    def update_patient(
        self, info: Info, organization_id: UUID, patient_id: UUID, data: UpdateDemographicsInput
    ) -> PatientDemographics:
        return patient_details(
            services.update_demographics(
                info.context.user,
                organization_id,
                patient_id,
                validated(inputs.UpdateDemographicsInput, data),
            )
        )
