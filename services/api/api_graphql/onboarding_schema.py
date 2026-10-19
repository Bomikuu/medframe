from uuid import UUID

import strawberry
from django.db import transaction
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.onboarding import drafts, verification
from medframe_apps.onboarding.completion import complete_onboarding
from medframe_apps.onboarding.logos import remove_logo
from medframe_apps.onboarding.models import ClinicOnboarding, MedicalSpecialty
from medframe_apps.onboarding.validation import NOTICE_VERSION, TYPES


@strawberry.type
class OnboardingQuery:
    @strawberry.field
    def onboarding_invitation(self, info: Info) -> JSON:
        return verification.bootstrap(info.context)

    @strawberry.field
    def onboarding_session(self, info: Info) -> JSON:
        return drafts.snapshot(info.context)

    @strawberry.field
    def onboarding_progress(self, info: Info) -> JSON:
        result = drafts.snapshot(info.context)
        return {
            key: result[key]
            for key in ["version", "current_step", "completed_steps", "status", "last_saved_at"]
        }

    @strawberry.field
    def available_specialties(self) -> JSON:
        return list(
            MedicalSpecialty.objects.filter(active=True)
            .order_by("category", "name")
            .values("code", "name", "category")
        )

    @strawberry.field
    def available_clinic_types(self) -> JSON:
        return [{"value": key, "label": label} for key, label in TYPES.items()]

    @strawberry.field
    def branding_presets(self) -> JSON:
        return [
            {"name": "Medframe", "primary": "#0F2D4A", "secondary": "#0EA5A4", "accent": "#22C1B6"},
            {"name": "Ocean", "primary": "#164E63", "secondary": "#0891B2", "accent": "#67E8F9"},
            {
                "name": "Evergreen",
                "primary": "#14532D",
                "secondary": "#15803D",
                "accent": "#86EFAC",
            },
        ]

    @strawberry.field
    def onboarding_notices(self) -> JSON:
        return {"version": NOTICE_VERSION, "development": True}


@strawberry.type
class OnboardingMutation:
    @strawberry.mutation
    def verify_onboarding_invitation(self, info: Info, token: str) -> JSON:
        return verification.exchange_invitation(info.context, token)

    @strawberry.mutation
    def request_onboarding_code(self, info: Info) -> JSON:
        return verification.request_email_code(info.context)

    @strawberry.mutation
    def verify_onboarding_email(self, info: Info, code: str) -> JSON:
        return verification.verify_email(info.context, code)

    @strawberry.mutation
    def start_clinic_onboarding(self, info: Info) -> JSON:
        return drafts.snapshot(info.context)

    @strawberry.mutation
    def save_onboarding_step(
        self, info: Info, step: str, data: JSON, expected_version: int, complete: bool = False
    ) -> JSON:
        return drafts.save_step(info.context, step, data, expected_version, complete)

    @strawberry.mutation
    def complete_onboarding_introduction(self, info: Info, skipped: bool = False) -> JSON:
        request = info.context
        state = "skipped" if skipped else "completed"
        request.session["onboarding_intro"] = state
        if request.session.get("onboarding_proof"):
            draft = verification.require_onboarding(request)
            draft.intro_status = state
            draft.save(update_fields=["intro_status"])
        return verification.bootstrap(request)

    @strawberry.mutation
    def remove_onboarding_logo(self, info: Info, expected_version: int) -> JSON:
        return remove_logo(info.context, expected_version)

    @strawberry.mutation
    def complete_clinic_onboarding(
        self, info: Info, expected_version: int, request_id: UUID
    ) -> JSON:
        return complete_onboarding(info.context, expected_version, request_id)

    @strawberry.mutation
    @transaction.atomic
    def cancel_clinic_onboarding(self, info: Info) -> JSON:
        draft = verification.require_onboarding(info.context)
        draft = ClinicOnboarding.objects.select_for_update().get(id=draft.id)
        draft.status = "cancelled"
        draft.save()
        return {"cancelled": True}

    @strawberry.mutation
    def request_onboarding_resume(self, info: Info) -> JSON:
        request = info.context
        from config.runtime import get_settings
        from medframe_apps.accounts.throttling import throttle
        from medframe_apps.onboarding.invitations import queue_mail

        invitation = verification.ClinicInvitation.objects.filter(
            id=request.session.get("onboarding_invitation")
        ).first()
        if invitation:
            verification.require_live(invitation)
            throttle(request, "onboarding-resume", str(invitation.id), 3, 3600)
            # Resume uses the original invitation process, not an unverified new draft URL.
            queue_mail(
                invitation, "clinic_resume", link=f"{get_settings().web_origin}/onboarding/setup"
            )
        return {"message": "Return using your original invitation and verify your email to resume."}


# Typed aliases share the same validation and ownership boundary.
def step_alias(step):
    def resolver(info: Info, data: JSON, expected_version: int, complete: bool = False) -> JSON:
        return drafts.save_step(info.context, step, data, expected_version, complete)

    return resolver


@strawberry.type
class StepMutation:
    update_clinic_information = strawberry.mutation(resolver=step_alias("clinic"))
    update_clinic_specialties = strawberry.mutation(resolver=step_alias("specialties"))
    update_clinic_branding = strawberry.mutation(resolver=step_alias("branding"))
    update_practice_details = strawberry.mutation(resolver=step_alias("practice"))


@strawberry.type
class Mutation(OnboardingMutation, StepMutation):
    pass


class SafeSchema(strawberry.Schema):
    def process_errors(self, errors, execution_context=None):
        pass


schema = SafeSchema(query=OnboardingQuery, mutation=Mutation)
