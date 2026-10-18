from uuid import UUID

import strawberry
from django.db import transaction
from django.db.models import Prefetch, Q
from strawberry.scalars import JSON
from strawberry.types import Info

from api_graphql.clinical_types import (
    DocumentType,
    EncounterType,
    ProviderType,
    document_details,
    encounter_details,
)
from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_page
from medframe_apps.dental.reference import TEETH
from medframe_apps.documents.models import DocumentVersion
from medframe_apps.documents.services import (
    authorize_document_download,
    begin_document_upload,
    require_document,
)
from medframe_apps.encounters import services
from medframe_apps.encounters.models import Encounter, EncounterRevision
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.services import require_patient, scoped_patients
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.treatments.models import TreatmentPlan
from medframe_apps.treatments.services import create_treatment_plan, update_treatment_item


def plan_details(plan):
    return {
        "id": str(plan.id),
        "title": plan.title,
        "version": plan.version,
        "items": [
            {
                "id": str(item.id),
                "position": item.position,
                "description": item.description,
                "status": item.status,
                "tooth": item.tooth,
                "completed_revision_id": str(item.completed_revision_id)
                if item.completed_revision_id
                else None,
            }
            for item in plan.items.order_by("position")[:30]
        ],
    }


@strawberry.type
class ClinicalQuery:
    @strawberry.field
    def providers(self, info: Info, organization_id: UUID) -> list[ProviderType]:
        member = require_membership(info.context.user, organization_id, "encounters.write")
        profiles = ProviderProfile.objects.filter(
            membership=member, membership__active=True
        ).select_related("membership__user")[:10]
        return [
            ProviderType(
                id=profile.id,
                display_name=profile.membership.user.display_name,
                specialty=profile.specialty,
                branch_id=profile.membership.branch_id,
            )
            for profile in profiles
        ]

    @strawberry.field
    @transaction.atomic
    def encounters(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID | None = None,
        first: int = 20,
        before: UUID | None = None,
    ) -> list[EncounterType]:
        check_page(first)
        allowed = scoped_patients(info.context.user, organization_id, "patients.clinical.read")
        queryset = Encounter.objects.filter(
            organization_id=organization_id, patient_id__in=allowed.values("id")
        )
        if patient_id:
            require_patient(
                info.context.user, organization_id, patient_id, "patients.clinical.read"
            )
            queryset = queryset.filter(patient_id=patient_id)
        if before:
            queryset = queryset.filter(id__lt=before)
        audit(info.context.user, "encounters.list", organization_id, patient_id)
        return [
            encounter_details(item)
            for item in queryset.select_related("patient", "draft")
            .prefetch_related(
                Prefetch(
                    "revisions",
                    queryset=EncounterRevision.objects.select_related("author").order_by(
                        "-version"
                    )[:20],
                    to_attr="loaded_revisions",
                )
            )
            .order_by("-id")[:first]
        ]

    @strawberry.field
    @transaction.atomic
    def encounter(
        self, info: Info, organization_id: UUID, encounter_id: UUID, revision_id: UUID | None = None
    ) -> EncounterType:
        encounter = services.require_encounter(info.context.user, organization_id, encounter_id)
        revision = None
        if revision_id:
            revision = encounter.revisions.filter(id=revision_id).first()
            if revision is None:
                raise DomainError("NOT_FOUND", "Consultation revision is unavailable.", 404)
        audit(info.context.user, "encounter.read", organization_id, encounter_id)
        return encounter_details(encounter, revision)

    @strawberry.field
    def dental_reference(self, info: Info, organization_id: UUID) -> JSON:
        require_membership(info.context.user, organization_id, "patients.clinical.read")
        return {
            "version": 1,
            "teeth": list(TEETH.values()),
            "review_status": "development_reference",
        }

    @strawberry.field
    def dental_chart(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        encounter_id: UUID | None = None,
        revision_id: UUID | None = None,
    ) -> JSON:
        return services.read_dental_chart(
            info.context.user, organization_id, patient_id, encounter_id, revision_id
        )

    @strawberry.field
    @transaction.atomic
    def tooth_history(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        tooth: str,
        first: int = 20,
        before: UUID | None = None,
    ) -> JSON:
        check_page(first)
        require_patient(info.context.user, organization_id, patient_id, "patients.clinical.read")
        if tooth not in TEETH:
            raise DomainError("INVALID_INPUT", "Choose a valid FDI tooth.")
        queryset = EncounterRevision.objects.filter(
            patient_id=patient_id, organization_id=organization_id, toothfinding__tooth=tooth
        ).distinct()
        if before:
            queryset = queryset.filter(id__lt=before)
        audit(info.context.user, "dental.tooth_history.read", organization_id, patient_id)
        return [
            {
                "revision_id": str(item.id),
                "encounter_id": str(item.encounter_id),
                "version": item.version,
                "created_at": item.created_at.isoformat(),
                "findings": [
                    value for value in item.content["findings"] if value["tooth"] == tooth
                ],
            }
            for item in queryset.order_by("-id")[:first]
        ]

    @strawberry.field
    def treatment_plans(
        self, info: Info, organization_id: UUID, patient_id: UUID, first: int = 20
    ) -> JSON:
        check_page(first)
        require_patient(info.context.user, organization_id, patient_id, "patients.clinical.read")
        return [
            plan_details(item)
            for item in TreatmentPlan.objects.filter(
                organization_id=organization_id, patient_id=patient_id
            ).order_by("-created_at")[:first]
        ]

    @strawberry.field
    def documents(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID | None = None,
        purpose: str = "clinical",
        first: int = 20,
        before: UUID | None = None,
    ) -> list[DocumentType]:
        check_page(first)
        if purpose == "clinical":
            require_patient(
                info.context.user, organization_id, patient_id, "patients.clinical.read"
            )
        else:
            require_membership(info.context.user, organization_id, "workspace.read")
            if purpose not in {"avatar", "logo"}:
                raise DomainError("INVALID_INPUT", "Choose a valid document purpose.")
        queryset = DocumentVersion.objects.filter(
            document__organization_id=organization_id,
            document__patient_id=patient_id,
            document__purpose=purpose,
        ).select_related("document")
        if purpose == "avatar":
            queryset = queryset.filter(document__uploaded_by=info.context.user)
        if before:
            cursor = queryset.filter(id=before).first()
            if cursor is None:
                raise DomainError("INVALID_INPUT", "Choose a valid document cursor.")
            queryset = queryset.filter(
                Q(created_at__lt=cursor.created_at)
                | Q(created_at=cursor.created_at, id__lt=cursor.id)
            )
        audit(info.context.user, "documents.list", organization_id, patient_id)
        return [document_details(item) for item in queryset.order_by("-created_at", "-id")[:first]]

    @strawberry.field
    def document_versions(
        self,
        info: Info,
        organization_id: UUID,
        version_ids: list[UUID],
        patient_id: UUID | None = None,
    ) -> list[DocumentType]:
        if len(version_ids) > 20:
            raise DomainError("INVALID_INPUT", "Choose at most 20 exact file versions.")
        result = []
        for identifier in version_ids:
            version = require_document(info.context.user, organization_id, identifier)
            if version.document.patient_id != patient_id:
                raise DomainError(
                    "NOT_FOUND", "Document version is unavailable for this record.", 404
                )
            result.append(document_details(version))
        return result


@strawberry.type
class ClinicalMutation:
    @strawberry.mutation
    def create_encounter(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        provider_id: UUID,
        branch_id: UUID,
        reason: str,
        request_id: UUID,
    ) -> EncounterType:
        encounter = services.create_encounter(
            info.context.user,
            organization_id,
            patient_id,
            provider_id,
            branch_id,
            reason,
            request_id,
        )
        return encounter_details(
            Encounter.objects.select_related("patient", "draft").get(id=encounter.id)
        )

    @strawberry.mutation
    def update_encounter_draft(
        self,
        info: Info,
        organization_id: UUID,
        encounter_id: UUID,
        content: JSON,
        expected_version: int,
    ) -> EncounterType:
        return encounter_details(
            services.save_encounter_draft(
                info.context.user, organization_id, encounter_id, content, expected_version
            )
        )

    @strawberry.mutation
    def transition_encounter(
        self,
        info: Info,
        organization_id: UUID,
        encounter_id: UUID,
        status: str,
        expected_version: int,
    ) -> EncounterType:
        return encounter_details(
            services.transition_encounter(
                info.context.user, organization_id, encounter_id, status, expected_version
            )
        )

    @strawberry.mutation
    def finalize_encounter(
        self, info: Info, organization_id: UUID, encounter_id: UUID, expected_version: int
    ) -> EncounterType:
        revision = services.finalize_encounter(
            info.context.user, organization_id, encounter_id, expected_version
        )
        encounter = Encounter.objects.select_related("patient", "draft").get(id=encounter_id)
        return encounter_details(encounter, revision)

    @strawberry.mutation
    def create_encounter_amendment(
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
    def add_diagnosis(
        self,
        info: Info,
        organization_id: UUID,
        encounter_id: UUID,
        data: JSON,
        expected_version: int,
    ) -> EncounterType:
        encounter = services.require_encounter(
            info.context.user, organization_id, encounter_id, write=True
        )
        content = dict(encounter.draft.content)
        content["diagnoses"] = [*content["diagnoses"], data]
        return encounter_details(
            services.save_encounter_draft(
                info.context.user, organization_id, encounter_id, content, expected_version
            )
        )

    @strawberry.mutation
    @transaction.atomic
    def add_observation(
        self,
        info: Info,
        organization_id: UUID,
        encounter_id: UUID,
        data: JSON,
        expected_version: int,
    ) -> EncounterType:
        encounter = services.require_encounter(
            info.context.user, organization_id, encounter_id, write=True
        )
        content = dict(encounter.draft.content)
        content["observations"] = [*content["observations"], data]
        return encounter_details(
            services.save_encounter_draft(
                info.context.user, organization_id, encounter_id, content, expected_version
            )
        )

    @strawberry.mutation
    @transaction.atomic
    def save_tooth_finding(
        self,
        info: Info,
        organization_id: UUID,
        encounter_id: UUID,
        data: JSON,
        expected_version: int,
    ) -> EncounterType:
        encounter = services.require_encounter(
            info.context.user, organization_id, encounter_id, write=True
        )
        if not isinstance(data, dict):
            raise DomainError("INVALID_INPUT", "Choose a valid tooth finding.")
        content = dict(encounter.draft.content)
        content["findings"] = [
            value for value in content["findings"] if value["key"] != data.get("key")
        ] + [data]
        return encounter_details(
            services.save_encounter_draft(
                info.context.user, organization_id, encounter_id, content, expected_version
            )
        )

    @strawberry.mutation
    @transaction.atomic
    def add_procedure(
        self,
        info: Info,
        organization_id: UUID,
        encounter_id: UUID,
        data: JSON,
        expected_version: int,
    ) -> EncounterType:
        encounter = services.require_encounter(
            info.context.user, organization_id, encounter_id, write=True
        )
        content = dict(encounter.draft.content)
        content["procedures"] = [*content["procedures"], data]
        return encounter_details(
            services.save_encounter_draft(
                info.context.user, organization_id, encounter_id, content, expected_version
            )
        )

    @strawberry.mutation
    def create_treatment_plan(
        self, info: Info, organization_id: UUID, patient_id: UUID, data: JSON, request_id: UUID
    ) -> JSON:
        return plan_details(
            create_treatment_plan(info.context.user, organization_id, patient_id, data, request_id)
        )

    @strawberry.mutation
    def update_treatment_item(
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
    def begin_document_upload(
        self,
        info: Info,
        organization_id: UUID,
        purpose: str,
        metadata: JSON,
        patient_id: UUID | None = None,
        encounter_id: UUID | None = None,
    ) -> DocumentType:
        return document_details(
            begin_document_upload(
                info.context.user, organization_id, patient_id, encounter_id, purpose, metadata
            )
        )

    @strawberry.mutation
    def authorize_document_download(
        self, info: Info, organization_id: UUID, version_id: UUID
    ) -> str:
        return authorize_document_download(info.context.user, organization_id, version_id)

    @strawberry.mutation
    def retry_document_scan(
        self, info: Info, organization_id: UUID, version_id: UUID
    ) -> DocumentType:
        from medframe_apps.documents.tasks import enqueue_scan

        version = require_document(info.context.user, organization_id, version_id, write=True)
        if version.scan_state in {"pending", "unavailable"}:
            enqueue_scan(version.id)
        version.refresh_from_db()
        return document_details(version)
