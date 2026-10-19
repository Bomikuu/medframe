from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction

from config.errors import DomainError
from medframe_apps.accounts import services
from medframe_apps.accounts.models import MfaCredential, User

from .models import ClinicOnboarding, OnboardingConsent, OnboardingVerification
from .validation import NOTICE_VERSION
from .verification import bind_proof, require_onboarding


@transaction.atomic
def begin_account(request, data):
    draft = require_onboarding(request, for_account=True)
    if not isinstance(data, dict) or set(data) - {
        "first_name",
        "last_name",
        "password",
        "confirm",
        "mode",
        "terms",
        "privacy",
    }:
        raise DomainError("INVALID_INPUT", "Check account fields.")
    if data.get("terms") is not True or data.get("privacy") is not True:
        raise DomainError(
            "INVALID_INPUT", "Read and acknowledge the development terms and privacy notices."
        )
    email = draft.invitation.email
    existing = User.objects.select_for_update().filter(email__iexact=email).first()
    password = data.get("password", "")
    if not isinstance(password, str) or not 15 <= len(password) <= 128:
        raise DomainError("INVALID_INPUT", "Enter an account password of 15–128 characters.")
    if existing:
        user = authenticate(request, username=existing.email, password=password)
        if not user or not user.is_active:
            raise DomainError("INVALID_CREDENTIALS", "Check your existing account password.", 401)
    else:
        if data.get("mode") != "new" or password != data.get("confirm"):
            raise DomainError("INVALID_INPUT", "Confirm the new account password.")
        name = " ".join(
            str(data.get(key, "")).strip() for key in ["first_name", "last_name"]
        ).strip()
        if not name or len(name) > 160:
            raise DomainError("INVALID_INPUT", "Enter your name, up to 160 characters.")
        try:
            validate_password(password, User(email=email, display_name=name))
        except ValidationError:
            raise DomainError(
                "INVALID_INPUT", "Choose a longer, less common password unrelated to your identity."
            ) from None
        user = User.objects.create_user(email, password, display_name=name)
    if draft.user_id and draft.user_id != user.id:
        raise DomainError("FORBIDDEN", "This setup belongs to another account.", 403)
    proof = OnboardingVerification.objects.get(id=request.session["onboarding_proof"])
    services.start_challenge(request, user, "staff")
    bind_proof(request, proof)
    request.session["onboarding_account_draft"] = str(draft.id)
    request.session["onboarding_consent"] = True
    return {
        "next_step": "verify"
        if MfaCredential.objects.filter(user=user, confirmed=True).exists()
        else "enroll"
    }


class OnboardingActivation:
    def prepare(self, user, request):
        draft = require_onboarding(request, for_account=True)
        if (
            str(draft.id) != request.session.get("onboarding_account_draft")
            or draft.invitation.email.casefold() != user.email.casefold()
            or not request.session.get("onboarding_consent")
        ):
            raise DomainError(
                "FORBIDDEN", "Restart account setup from your verified invitation.", 403
            )
        self.draft = ClinicOnboarding.objects.select_for_update().get(id=draft.id)

    def complete(self, user, request):
        draft = self.draft
        draft.user = user
        draft.auth_epoch = user.auth_epoch
        draft.completed_steps = list(dict.fromkeys([*draft.completed_steps, "account"]))
        draft.current_step = "review"
        draft.status = "ready_for_review"
        draft.version += 1
        draft.save()
        OnboardingConsent.objects.update_or_create(
            draft=draft,
            defaults={
                "user": user,
                "terms_version": NOTICE_VERSION,
                "privacy_version": NOTICE_VERSION,
            },
        )
