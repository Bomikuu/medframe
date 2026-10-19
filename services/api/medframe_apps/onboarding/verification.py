import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from config.crypto import digest
from config.errors import DomainError
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.accounts.throttling import throttle

from .invitations import queue_mail
from .models import ClinicInvitation, ClinicOnboarding, OnboardingVerification
from .policy import invitation_state, require_live


def code_digest(identifier, code):
    return hmac.new(
        settings.SECRET_KEY.encode(), f"onboarding:{identifier}:{code}".encode(), hashlib.sha256
    ).hexdigest()


def session_key(request):
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key


def bootstrap(request):
    invitation = ClinicInvitation.objects.filter(
        id=request.session.get("onboarding_invitation")
    ).first()
    if not invitation:
        return {
            "status": "invalid",
            "masked_email": "",
            "intro_status": "not_started",
            "verified": False,
        }
    email = invitation.email.split("@")
    draft = ClinicOnboarding.objects.filter(invitation=invitation).first()
    return {
        "status": invitation_state(invitation),
        "masked_email": email[0][:1] + "•••@" + email[-1],
        "intro_status": draft.intro_status
        if draft
        else request.session.get("onboarding_intro", "not_started"),
        "verified": bool(request.session.get("onboarding_proof")),
    }


def exchange_invitation(request, token):
    if not isinstance(token, str) or not 40 <= len(token) <= 100:
        raise DomainError("INVITATION_UNAVAILABLE", "This invitation is unavailable.", 403)
    throttle(request, "onboarding-exchange", digest(token), 20, 300)
    invitation = ClinicInvitation.objects.filter(token_hash=digest(token)).first()
    if not invitation:
        raise DomainError("INVITATION_UNAVAILABLE", "This invitation is unavailable.", 403)
    request.session["onboarding_invitation"] = str(invitation.id)
    if invitation_state(invitation) not in {"completed", "expired", "revoked"}:
        ClinicInvitation.objects.filter(id=invitation.id, opened_at__isnull=True).update(
            opened_at=timezone.now()
        )
    return bootstrap(request)


def request_email_code(request):
    invitation = ClinicInvitation.objects.filter(
        id=request.session.get("onboarding_invitation")
    ).first()
    if not invitation:
        raise DomainError("INVITATION_UNAVAILABLE", "Open your invitation link first.", 403)
    require_live(invitation)
    throttle(request, "onboarding-code", str(invitation.id), 1, 60)
    throttle(request, "onboarding-code-hour", str(invitation.id), 10, 3600)
    OnboardingVerification.objects.filter(
        invitation=invitation, session_hash=digest(session_key(request))
    ).update(invalidated=True)
    code = f"{secrets.randbelow(1000000):06d}"
    proof = OnboardingVerification.objects.create(
        invitation=invitation,
        generation=invitation.generation,
        session_hash=digest(session_key(request)),
        code_hash="",
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    proof.code_hash = code_digest(proof.id, code)
    proof.save(update_fields=["code_hash"])
    request.session["onboarding_challenge"] = str(proof.id)
    queue_mail(invitation, "clinic_email_code", code=code)
    return {"message": "A verification code has been sent to the invited email."}


def bind_proof(request, proof):
    proof.session_hash = digest(session_key(request))
    proof.last_seen = timezone.now()
    proof.save(update_fields=["session_hash", "last_seen"])
    request.session["onboarding_invitation"] = str(proof.invitation_id)
    request.session["onboarding_proof"] = str(proof.id)


def verify_email(request, code):
    error = None
    with transaction.atomic():
        proof = (
            OnboardingVerification.objects.select_for_update()
            .select_related("invitation")
            .filter(id=request.session.get("onboarding_challenge"))
            .first()
        )
        now = timezone.now()
        if (
            not proof
            or proof.invalidated
            or proof.verified_at
            or proof.expires_at <= now
            or proof.attempts >= 5
            or proof.session_hash != digest(session_key(request))
            or proof.generation != proof.invitation.generation
        ):
            raise DomainError(
                "INVALID_CODE", "This code is unavailable. Request another code.", 403
            )
        require_live(proof.invitation)
        proof.attempts += 1
        if not isinstance(code, str) or not hmac.compare_digest(
            proof.code_hash, code_digest(proof.id, code)
        ):
            proof.save(update_fields=["attempts"])
            error = DomainError("INVALID_CODE", "Check the six-digit code.", 403)
        else:
            old_key = request.session.session_key
            request.session.cycle_key()
            if request.user.is_authenticated:
                ClinicalSession.objects.filter(
                    user=request.user, session_key=old_key, revoked=False
                ).update(session_key=request.session.session_key)
            proof.verified_at = now
            proof.proof_expires = min(now + timedelta(hours=8), proof.invitation.expires_at)
            proof.save()
            bind_proof(request, proof)
            proof.invitation.verified_at = now
            proof.invitation.save(update_fields=["verified_at"])
            from medframe_apps.auditing.services import audit

            audit(
                request.user if request.user.is_authenticated else None,
                "onboarding.email_verified",
                resource_id=proof.invitation_id,
            )
            draft, _ = ClinicOnboarding.objects.get_or_create(
                invitation=proof.invitation,
                defaults={
                    "status": "in_progress",
                    "intro_status": request.session.get("onboarding_intro", "completed"),
                },
            )
            if draft.status == "cancelled":
                raise DomainError(
                    "INVITATION_UNAVAILABLE",
                    "This setup was cancelled. Ask for a new invitation.",
                    403,
                )
    if error:
        raise error
    from .drafts import snapshot

    return snapshot(request)


def require_onboarding(request, allow_completed=False, for_account=False):
    proof = (
        OnboardingVerification.objects.select_related("invitation")
        .filter(id=request.session.get("onboarding_proof"))
        .first()
    )
    now = timezone.now()
    if (
        not proof
        or proof.invalidated
        or not proof.verified_at
        or proof.proof_expires <= now
        or proof.last_seen <= now - timedelta(minutes=30)
        or proof.session_hash != digest(session_key(request))
        or proof.generation != proof.invitation.generation
    ):
        raise DomainError("VERIFICATION_REQUIRED", "Verify the invited email to resume setup.", 401)
    draft = ClinicOnboarding.objects.select_related("invitation", "user", "organization").get(
        invitation=proof.invitation
    )
    if not (allow_completed and draft.completed_at):
        require_live(proof.invitation)
    if draft.status == "cancelled":
        raise DomainError("INVITATION_UNAVAILABLE", "This setup was cancelled.", 403)
    if (
        draft.user_id
        and not for_account
        and (
            not request.user.is_authenticated
            or request.user.id != draft.user_id
            or request.user.auth_epoch != draft.auth_epoch
            or not request.session.get("mfa_verified")
            or request.session.get("auth_realm") != "staff"
        )
    ):
        raise DomainError(
            "ACCOUNT_REQUIRED", "Sign in as the invited account to resume setup.", 401
        )
    proof.last_seen = now
    proof.save(update_fields=["last_seen"])
    return draft
