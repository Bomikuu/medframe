"""Google sign-up proves contact; clinic acceptance and native MFA still own access."""

import hmac
import time
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from email_validator import EmailNotValidError, validate_email

from config.crypto import digest
from config.errors import DomainError
from config.runtime import get_settings
from medframe_apps.accounts import google_signin
from medframe_apps.accounts.models import GoogleIdentity, MfaCredential, User
from medframe_apps.accounts.services import start_challenge
from medframe_apps.common import advisory_lock
from medframe_apps.auditing.services import audit
from medframe_apps.patients.models import Patient
from medframe_apps.portal.invitations import valid_invitation
from medframe_apps.portal.models import PortalInvitation
from medframe_apps.portal.registration_contact import bootstrap, session_hash
from medframe_apps.portal.registration_models import RegistrationContact


def prepare(request, purpose):
    return google_signin.prepare(request, purpose)


def claims_for(request, credential, purpose):
    client_id = get_settings().google_client_id
    if not client_id:
        raise DomainError("GOOGLE_UNAVAILABLE", "Google sign-up has not been configured.", 503)
    if not isinstance(credential, str) or not 1 <= len(credential) <= 16384:
        raise DomainError("INVALID_GOOGLE", "Try signing up with Google again.", 401)
    nonce = request.session.pop(f"google_nonce_{purpose}", {})
    if nonce.get("expires", 0) <= time.time():
        raise DomainError("GOOGLE_EXPIRED", "Google sign-up expired. Reload and try again.", 401)
    claims = google_signin.verify_credential(credential, client_id)
    email, subject, token_nonce = claims.get("email"), claims.get("sub"), claims.get("nonce")
    if (
        not isinstance(subject, str)
        or not 1 <= len(subject) <= 255
        or not isinstance(email, str)
        or claims.get("email_verified") is not True
        or not isinstance(token_nonce, str)
        or not hmac.compare_digest(token_nonce, nonce.get("value", ""))
    ):
        raise DomainError("INVALID_GOOGLE", "Google sign-up could not be verified.", 401)
    try:
        email = validate_email(email, check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        raise DomainError(
            "INVALID_GOOGLE", "Use a Google account with a valid email.", 401
        ) from None
    if len(email) > 254:
        raise DomainError("INVALID_GOOGLE", "Use another email for patient registration.", 401)
    authoritative = email.endswith("@gmail.com") or bool(claims.get("hd"))
    return email, subject, authoritative, str(claims.get("name", ""))[:160]


@transaction.atomic
def verify_contact(request, entry, credential):
    email, _, authoritative, _ = claims_for(request, credential, f"registration:{entry.id}")
    if not authoritative:
        raise DomainError(
            "EMAIL_CODE_REQUIRED",
            "Verify this email with a code. Google does not manage this email address.",
        )
    bound = session_hash(request)
    advisory_lock(f"patient-registration-code:{entry.id}:{bound}")
    RegistrationContact.objects.filter(entry=entry, session_hash=bound).update(invalidated=True)
    now = timezone.now()
    proof = RegistrationContact.objects.create(
        entry=entry,
        email=email,
        channel="google",
        session_hash=bound,
        code_hash="",
        expires_at=now + timedelta(minutes=10),
        verified_at=now,
        verified_until=now + timedelta(minutes=30),
        delivery_state="accepted",
    )
    request.session["patient_registration_proof"] = str(proof.id)
    request.session.pop("patient_registration_challenge", None)
    return bootstrap(request, entry)


def invitation_for(token):
    if not isinstance(token, str) or not 20 <= len(token) <= 128:
        raise DomainError("INVALID_INVITATION", "Open the clinic invitation link.", 403)
    invitation = (
        PortalInvitation.objects.select_related("organization")
        .filter(token_hash=digest(token))
        .first()
    )
    valid_invitation(invitation)
    return invitation


@transaction.atomic
def activate_invitation(request, token, credential):
    pending = invitation_for(token)
    email, subject, authoritative, name = claims_for(
        request, credential, f"patient-invitation:{pending.id}"
    )
    if email != pending.email:
        raise DomainError(
            "INVALID_GOOGLE", "Choose the Google account matching this invitation.", 401
        )
    advisory_lock(f"portal-identity:{email}")
    identity = GoogleIdentity.objects.select_related("user").filter(subject=subject).first()
    user = User.objects.select_for_update().filter(email=email).first()
    if user:
        # Existing accounts must prove the already-bound identity. Never merge by email.
        if not identity or identity.user_id != user.id or not user.is_active:
            raise DomainError(
                "GOOGLE_ACCOUNT_UNAVAILABLE",
                "Use your existing password to accept this invitation, then connect Google after sign-in.",
                401,
            )
    else:
        if identity or not authoritative:
            raise DomainError(
                "GOOGLE_ACCOUNT_UNAVAILABLE",
                "Use email and password to accept this invitation.",
                401,
            )
        user = User(email=email, display_name=name)
        user.set_unusable_password()
        user.save()
        # Persist only the new account's proved first factor, so interrupted MFA can resume.
        # No session or portal grant is issued here; existing accounts are never auto-linked.
        GoogleIdentity.objects.create(user=user, subject=subject)
        audit(user, "auth.google_signup_pending", resource_id=user.id)
    Patient.objects.select_for_update().get(id=pending.patient_id)
    invitation = (
        PortalInvitation.objects.select_for_update()
        .select_related("organization")
        .get(id=pending.id)
    )
    valid_invitation(invitation)
    start_challenge(request, user, "patient")
    request.session["portal_invitation"] = str(invitation.id)
    request.session["challenge_google"] = {"subject": subject, "email": email}
    invitation.pending_user, invitation.pending_epoch = user, user.auth_epoch
    invitation.pending_session_hash = digest(request.session.session_key)
    invitation.save(update_fields=["pending_user", "pending_epoch", "pending_session_hash"])
    return (
        "verify" if MfaCredential.objects.filter(user=user, confirmed=True).exists() else "enroll"
    )
