from uuid import UUID

import strawberry
from django.utils import timezone
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.auditing.models import Notification
from medframe_apps.branding import services
from medframe_apps.documents.models import DocumentVersion
from medframe_apps.encounters.models import Encounter
from medframe_apps.organizations.policy import permissions_for, require_membership
from medframe_apps.patients.services import scoped_patients
from medframe_apps.treatments.models import FollowUp, TreatmentPlanItem


@strawberry.type
class WorkspaceQuery:
    @strawberry.field
    def clinic_appearance(self, info: Info, organization_id: UUID) -> JSON:
        return services.read_appearance(info.context.user, organization_id)

    @strawberry.field
    def organization_branding(self, info: Info, organization_id: UUID) -> JSON:
        return services.read_appearance(info.context.user, organization_id)["organization"]

    @strawberry.field
    def user_preferences(self, info: Info, organization_id: UUID) -> JSON:
        return services.read_appearance(info.context.user, organization_id)["personal"]

    @strawberry.field
    def clinic_dashboard(self, info: Info, organization_id: UUID) -> JSON:
        user = info.context.user
        member = require_membership(user, organization_id, "workspace.read")
        permissions = permissions_for(member)
        patients = (
            scoped_patients(user, organization_id)
            if "patients.demographics.read" in permissions
            else None
        )
        clinical = (
            scoped_patients(user, organization_id, "patients.clinical.read")
            if "patients.clinical.read" in permissions
            else None
        )
        encounters = (
            Encounter.objects.filter(
                organization_id=organization_id, patient_id__in=clinical.values("id")
            )
            if clinical is not None
            else Encounter.objects.none()
        )
        documents = (
            DocumentVersion.objects.filter(
                document__organization_id=organization_id,
                document__patient_id__in=clinical.values("id"),
            )
            if clinical is not None
            else DocumentVersion.objects.none()
        )
        return {
            "patient_count": patients.count() if patients is not None else 0,
            "draft_count": encounters.exclude(status="finalized").count(),
            "pending_treatment_count": TreatmentPlanItem.objects.filter(
                plan__organization_id=organization_id,
                plan__patient_id__in=clinical.values("id"),
                status__in=["proposed", "planned", "in_progress"],
            ).count()
            if clinical is not None
            else 0,
            "recent_consultations": [
                {
                    "id": str(item.id),
                    "patient_name": item.patient.full_name,
                    "status": item.status,
                    "updated_at": item.updated_at.isoformat(),
                }
                for item in encounters.select_related("patient").order_by("-updated_at")[:5]
            ],
            "recent_documents": [
                {
                    "id": str(item.id),
                    "patient_id": str(item.document.patient_id),
                    "label": item.document.label,
                    "scan_state": item.scan_state,
                }
                for item in documents.select_related("document").order_by("-created_at")[:5]
            ],
            "follow_ups": [
                {
                    "id": str(item.id),
                    "patient_id": str(item.patient_id),
                    "instructions": item.instructions,
                    "due_date": item.due_date.isoformat() if item.due_date else None,
                }
                for item in FollowUp.objects.filter(
                    organization_id=organization_id,
                    patient_id__in=clinical.values("id"),
                    status="open",
                ).order_by("due_date", "created_at")[:5]
            ]
            if clinical is not None
            else [],
        }

    @strawberry.field
    def notifications(self, info: Info, organization_id: UUID) -> JSON:
        require_membership(info.context.user, organization_id, "workspace.read")
        return [
            {
                "id": str(item.id),
                "kind": item.kind,
                "read": item.read_at is not None,
                "created_at": item.created_at.isoformat(),
            }
            for item in Notification.objects.filter(
                user=info.context.user, organization_id=organization_id
            ).order_by("-created_at")[:30]
        ]


@strawberry.type
class WorkspaceMutation:
    @strawberry.mutation
    def update_organization_branding(
        self, info: Info, organization_id: UUID, settings: JSON, expected_version: int
    ) -> JSON:
        return services.save_organization_branding(
            info.context.user, organization_id, settings, expected_version
        )

    @strawberry.mutation
    def update_user_preferences(
        self, info: Info, organization_id: UUID, settings: JSON, expected_version: int
    ) -> JSON:
        return services.save_user_preferences(
            info.context.user, organization_id, settings, expected_version
        )

    @strawberry.mutation
    def save_dashboard_layout(
        self, info: Info, organization_id: UUID, widgets: JSON, expected_version: int
    ) -> JSON:
        current = services.read_appearance(info.context.user, organization_id)
        return services.save_user_preferences(
            info.context.user,
            organization_id,
            current["personal"]["settings"],
            expected_version,
            widgets,
        )

    @strawberry.mutation
    def reset_organization_branding(
        self, info: Info, organization_id: UUID, expected_version: int
    ) -> JSON:
        return services.save_organization_branding(
            info.context.user, organization_id, {}, expected_version
        )

    @strawberry.mutation
    def reset_user_preferences(
        self, info: Info, organization_id: UUID, expected_version: int
    ) -> JSON:
        return services.save_user_preferences(
            info.context.user, organization_id, {}, expected_version, services.default_widgets()
        )

    @strawberry.mutation
    def mark_notifications_read(self, info: Info, organization_id: UUID, ids: list[UUID]) -> bool:
        from config.errors import DomainError

        require_membership(info.context.user, organization_id, "workspace.read")
        if len(ids) > 30:
            raise DomainError("INVALID_INPUT", "Choose at most 30 notifications.")
        Notification.objects.filter(
            user=info.context.user, organization_id=organization_id, id__in=ids
        ).update(read_at=timezone.now())
        return True
