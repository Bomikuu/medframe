from django.db import transaction
from django.utils import timezone

from config.crypto import digest
from config.errors import DomainError
from medframe_apps.accounts.models import User
from medframe_apps.auditing.services import audit
from medframe_apps.branding.models import OrganizationBranding
from medframe_apps.branding.services import ThemeSettings
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.organizations.policy import seed_roles

from .logos import promote_logo
from .models import (
    ClinicInvitation,
    ClinicOnboarding,
    OnboardingConsent,
    OrganizationPractice,
    OrganizationProfile,
    OrganizationSpecialty,
    PracticeDay,
    ProviderTypeSelection,
    SetupChecklistState,
    SpecialtyRequest,
)
from .policy import require_live
from .validation import NOTICE_VERSION, validate_step
from .verification import require_onboarding


@transaction.atomic
def complete_onboarding(request, expected_version, request_id):
    if not request.user.is_authenticated:
        raise DomainError("ACCOUNT_REQUIRED", "Complete account verification first.", 401)
    User.objects.select_for_update().get(id=request.user.id)
    draft = require_onboarding(request, allow_completed=True)
    invitation = ClinicInvitation.objects.select_for_update().get(id=draft.invitation_id)
    draft = ClinicOnboarding.objects.select_for_update().get(id=draft.id)
    payload_digest = digest(f"{draft.id}:{expected_version}")
    if draft.completed_at:
        if draft.completion_key == request_id and draft.completion_digest != payload_digest:
            raise DomainError("CONFLICT", "The completion request changed.", 409)
        return draft.completion_result
    require_live(invitation)
    check_version(draft.version, expected_version)
    if (
        draft.user_id != request.user.id
        or draft.auth_epoch != request.user.auth_epoch
        or request.user.email.casefold() != invitation.email.casefold()
    ):
        raise DomainError("FORBIDDEN", "The verified invited account is required.", 403)
    if not OnboardingConsent.objects.filter(
        draft=draft, user=request.user, terms_version=NOTICE_VERSION, privacy_version=NOTICE_VERSION
    ).exists():
        raise DomainError("INVALID_INPUT", "Acknowledge the current notices first.")
    clinic, specialties, branding, practice = [
        validate_step(step, draft.progress_data.get(step, {}), True)
        for step in ["clinic", "specialties", "branding", "practice"]
    ]
    advisory_lock("onboarding-name:" + clinic["name"].casefold())
    if Organization.objects.filter(name__iexact=clinic["name"]).exists():
        raise DomainError(
            "CONFLICT", "A clinic with this name exists. Choose a distinct clinic name.", 409
        )
    organization = Organization.objects.create(
        name=clinic["name"], clinic_type=clinic["clinic_type"], timezone=practice["timezone"]
    )
    branch = Branch.objects.create(organization=organization, name=practice["branch_name"])
    seed_roles()
    membership = Membership.objects.create(user=request.user, organization=organization)
    membership.roles.add("clinic_administrator")
    OrganizationProfile.objects.create(
        organization=organization,
        short_name=branding["short_name"],
        **{
            key: clinic[key]
            for key in [
                "email",
                "phone",
                "country",
                "region",
                "city",
                "street",
                "postal_code",
                "description",
            ]
        },
    )
    OrganizationSpecialty.objects.bulk_create(
        [
            OrganizationSpecialty(organization=organization, specialty_id=code)
            for code in specialties["codes"]
        ]
    )
    if specialties["custom"]:
        SpecialtyRequest.objects.create(organization=organization, label=specialties["custom"])
    settings = OrganizationPractice.objects.create(
        organization=organization,
        branch=branch,
        duration_minutes=practice["duration_minutes"],
        walk_in_policy=practice["walk_in_policy"],
        provider_count=specialties["provider_count"],
    )
    PracticeDay.objects.bulk_create(
        [
            PracticeDay(
                practice=settings, weekday=day, opens=practice["opens"], closes=practice["closes"]
            )
            for day in practice["days"]
        ]
    )
    ProviderTypeSelection.objects.bulk_create(
        [
            ProviderTypeSelection(practice=settings, kind=value)
            for value in specialties["provider_types"]
        ]
    )
    logo = promote_logo(draft, request.user, organization)
    theme = ThemeSettings(
        primary=branding["primary"],
        secondary=branding["secondary"],
        accent=branding["accent"],
        logo_id=str(logo.id) if logo else None,
    ).model_dump()
    OrganizationBranding.objects.create(organization=organization, settings=theme)
    SetupChecklistState.objects.create(user=request.user, organization=organization)
    now = timezone.now()
    invitation.completed_at = now
    invitation.save(update_fields=["completed_at"])
    draft.organization = organization
    draft.completed_at = now
    draft.status = "completed"
    draft.completion_key = request_id
    draft.completion_digest = payload_digest
    draft.completion_result = {
        "organization_id": str(organization.id),
        "branch_id": str(branch.id),
        "membership_id": str(membership.id),
        "completed_at": now.isoformat(),
    }
    draft.version += 1
    draft.save()
    audit(request.user, "onboarding.completed", organization.id, draft.id)
    return draft.completion_result
