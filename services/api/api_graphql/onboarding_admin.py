from uuid import UUID

import strawberry
from django.db import transaction
from strawberry.scalars import JSON
from strawberry.types import Info

from config.errors import DomainError
from medframe_apps.common import check_version
from medframe_apps.onboarding.invitations import issue_invitation, manage_invitation, serialize
from medframe_apps.onboarding.models import ClinicInvitation, ClinicOnboarding, SetupChecklistState
from medframe_apps.onboarding.policy import require_platform_admin
from medframe_apps.organizations.policy import permissions_for, require_membership
from medframe_apps.patients.models import Patient


@strawberry.type
class OnboardingAdminQuery:
    @strawberry.field
    def platform_capabilities(self, info: Info) -> JSON:
        try:
            require_platform_admin(info.context)
            return {"clinic_invitations": True}
        except DomainError:
            return {"clinic_invitations": False}

    @strawberry.field
    def clinic_invitations(self, info: Info, offset: int = 0, status: str = "") -> JSON:
        require_platform_admin(info.context)
        if not 0 <= offset <= 10000:
            raise DomainError("INVALID_INPUT", "Use a valid page.")
        rows = ClinicInvitation.objects.order_by("-created_at")
        # The management list is bounded; status is evaluated at request time.
        values = [serialize(value) for value in rows[:10050]]
        if status:
            values = [value for value in values if value["status"] == status]
        return {"items": values[offset : offset + 25], "has_more": len(values) > offset + 25}

    @strawberry.field
    def clinic_setup_checklist(self, info: Info, organization_id: UUID) -> JSON:
        member = require_membership(info.context.user, organization_id, "workspace.read")
        if not ClinicOnboarding.objects.filter(
            organization_id=organization_id, status="completed"
        ).exists():
            return {"available": False}
        state = SetupChecklistState.objects.filter(
            organization_id=organization_id, user=info.context.user
        ).first()
        from zoneinfo import ZoneInfo

        from django.utils import timezone

        from medframe_apps.encounters.models import ConsultationTemplate
        from medframe_apps.onboarding.models import OrganizationSpecialty
        from medframe_apps.operations.models import ProviderSchedule

        codes = permissions_for(member)
        schedules = ProviderSchedule.objects.filter(
            branch__organization_id=organization_id,
            active=True,
            effective_to__gte=timezone.localdate(timezone=ZoneInfo(member.organization.timezone)),
        )
        if member.branch_id:
            schedules = schedules.filter(branch_id=member.branch_id)
        return {
            "available": True,
            "dismissed": state.dismissed if state else False,
            "version": state.version if state else 0,
            "has_patient": Patient.objects.filter(organization_id=organization_id).exists(),
            "has_specialty": OrganizationSpecialty.objects.filter(
                organization_id=organization_id, specialty__active=True
            ).exists(),
            "has_template": ConsultationTemplate.objects.filter(
                organization_id=organization_id, active=True
            ).exists()
            if "encounters.write" in codes
            else None,
            "has_schedule": schedules.exists() if "operations.read" in codes else None,
        }


@strawberry.type
class OnboardingAdminMutation:
    @strawberry.mutation
    def invite_clinic(self, info: Info, data: JSON, request_id: UUID) -> JSON:
        return issue_invitation(info.context, data, request_id)

    @strawberry.mutation
    def resend_clinic_invitation(
        self, info: Info, invitation_id: UUID, expected_version: int
    ) -> JSON:
        return manage_invitation(info.context, invitation_id, expected_version, "resend")

    @strawberry.mutation
    def revoke_clinic_invitation(
        self, info: Info, invitation_id: UUID, expected_version: int
    ) -> JSON:
        return manage_invitation(info.context, invitation_id, expected_version, "revoke")

    @strawberry.mutation
    @transaction.atomic
    def dismiss_clinic_setup(
        self, info: Info, organization_id: UUID, expected_version: int
    ) -> JSON:
        require_membership(info.context.user, organization_id, "workspace.read")
        state, _ = SetupChecklistState.objects.select_for_update().get_or_create(
            organization_id=organization_id, user=info.context.user, defaults={"version": 0}
        )
        check_version(state.version, expected_version)
        state.dismissed = True
        state.version += 1
        state.save()
        return {"dismissed": True, "version": state.version}
