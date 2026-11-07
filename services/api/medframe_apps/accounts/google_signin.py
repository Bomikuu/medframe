"""Google proves the first factor; first-time identity linking still requires native MFA."""

import hmac
import secrets
import time

from django.db import IntegrityError, transaction
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request
from google.oauth2.id_token import verify_oauth2_token

from config.errors import DomainError
from config.runtime import get_settings
from medframe_apps.accounts.models import GoogleIdentity, MfaCredential, User
from medframe_apps.accounts.services import start_challenge
from medframe_apps.auditing.services import audit
from medframe_apps.organizations.models import Membership
from medframe_apps.portal.policy import eligible_patient


def allowed_in_realm(user, realm):
    if not user.is_active:
        return False
    if realm == "patient":
        return eligible_patient(user)
    return realm == "staff" and (
        user.is_staff
        or Membership.objects.filter(
            user=user,
            active=True,
            organization__active=True,
            roles__permissions__codename="workspace.read",
        ).exists()
    )


def prepare(request, realm):
    client_id = get_settings().google_client_id
    if not client_id:
        return {"enabled": False}
    nonce = secrets.token_urlsafe(32)
    request.session[f"google_nonce_{realm}"] = {
        "value": nonce,
        "expires": time.time() + 600,
    }
    return {"enabled": True, "clientId": client_id, "nonce": nonce}


def verify_credential(credential, client_id):
    # Bound the public-key fetch independently of the web proxy timeout.
    transport = Request()

    def fetch(*args, **kwargs):
        kwargs["timeout"] = 8
        return transport(*args, **kwargs)

    try:
        return verify_oauth2_token(credential, fetch, client_id)
    except (ValueError, GoogleAuthError):
        raise DomainError(
            "INVALID_GOOGLE", "Google sign-in could not be verified. Try again.", 401
        ) from None


@transaction.atomic
def begin(request, credential, remember, realm, *, shared_device=False):
    client_id = get_settings().google_client_id
    if not client_id:
        raise DomainError("GOOGLE_UNAVAILABLE", "Google sign-in has not been configured.", 503)
    if not isinstance(remember, bool) or not isinstance(credential, str) or not credential:
        raise DomainError("INVALID_INPUT", "Try signing in with Google again.")
    if len(credential) > 16384:
        raise DomainError("INVALID_INPUT", "Try signing in with Google again.")
    nonce = request.session.pop(f"google_nonce_{realm}", {})
    if nonce.get("expires", 0) <= time.time():
        raise DomainError("GOOGLE_EXPIRED", "Google sign-in expired. Reload and try again.", 401)
    claims = verify_credential(credential, client_id)
    subject = claims.get("sub")
    token_nonce = claims.get("nonce")
    email = claims.get("email")
    if (
        not isinstance(token_nonce, str)
        or not hmac.compare_digest(token_nonce, nonce["value"])
        or not isinstance(subject, str)
        or not 1 <= len(subject) <= 255
        or not isinstance(email, str)
        or len(email) > 320
        or claims.get("email_verified") is not True
    ):
        raise DomainError("INVALID_GOOGLE", "Google sign-in could not be verified.", 401)
    identity = GoogleIdentity.objects.filter(subject=subject).first()
    users = User.objects.select_for_update()
    user = (
        users.filter(id=identity.user_id).first()
        if identity
        else users.filter(email=email.strip().lower()).first()
    )
    if (
        user is None
        or not allowed_in_realm(user, realm)
        or not MfaCredential.objects.filter(user=user, confirmed=True).exists()
        or GoogleIdentity.objects.filter(user=user).exclude(subject=subject).exists()
    ):
        raise DomainError(
            "GOOGLE_ACCOUNT_UNAVAILABLE",
            "Use your clinic-provided account and finish authenticator setup with your password "
            "first. Contact your clinic if you need access.",
            401,
        )
    start_challenge(request, user, realm, remember=remember, shared_device=shared_device)
    # Bind only after the existing account's MFA succeeds. Never store Google tokens.
    request.session["challenge_google"] = {"subject": subject, "email": user.email}
    audit(user, "auth.google_verified", resource_id=user.id)
    from medframe_apps.accounts.session_completion import routine_sign_in

    # Only an already-linked identity can use a reduced-factor routine sign-in.
    return routine_sign_in(request, user, realm, allow_reduced=identity is not None)


def complete_google_link(request, user, realm):
    pending = request.session.get("challenge_google")
    if not pending:
        return
    if not allowed_in_realm(user, realm) or pending["email"] != user.email:
        raise DomainError("FORBIDDEN", "Your access changed. Sign in again.", 403)
    identity = GoogleIdentity.objects.select_for_update().filter(user=user).first()
    if identity:
        if identity.subject != pending["subject"]:
            raise DomainError("INVALID_GOOGLE", "Use the Google account already connected.", 401)
        return
    try:
        with transaction.atomic():
            GoogleIdentity.objects.create(user=user, subject=pending["subject"])
    except IntegrityError:
        raise DomainError(
            "INVALID_GOOGLE", "This Google account cannot be connected.", 401
        ) from None
    audit(user, "auth.google_linked", resource_id=user.id)
