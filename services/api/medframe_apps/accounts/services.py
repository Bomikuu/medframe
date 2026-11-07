import hmac
import json
import re
import secrets
import time

import pyotp
from django.contrib.auth import authenticate, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from config.crypto import cipher, digest
from config.errors import DomainError
from config.runtime import get_settings
from medframe_apps.accounts.models import (
    ClinicalSession,
    MailOutbox,
    MfaCredential,
    PasswordReset,
    RecoveryCode,
    User,
)
from medframe_apps.accounts.session_realms import SessionActivation, SessionRealm
from medframe_apps.auditing.services import audit
from medframe_apps.organizations.models import Membership


@transaction.atomic
def begin_login(
    request,
    email,
    password,
    *,
    realm: SessionRealm = "staff",
    eligibility=None,
    remember=False,
    shared_device=False,
):
    if (
        not isinstance(email, str)
        or not isinstance(password, str)
        or len(email) > 320
        or len(password) > 128
    ):
        raise DomainError("INVALID_INPUT", "Check your email and password.")
    identity = email.strip().lower()
    # Consistent user-first locking serializes password/MFA/reset lifecycle changes.
    User.objects.select_for_update().filter(email=identity).first()
    user = authenticate(request, username=identity, password=password)
    if user is None:
        raise DomainError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401)
    allowed = (
        (
            user.is_staff
            or Membership.objects.filter(
                user=user,
                active=True,
                organization__active=True,
                roles__permissions__codename="workspace.read",
            ).exists()
        )
        if realm == "staff"
        else bool(eligibility and eligibility(user))
    )
    if realm not in {"staff", "patient"} or not allowed:
        raise DomainError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401)
    start_challenge(request, user, realm, remember=remember, shared_device=shared_device)
    audit(user, "auth.password_verified", resource_id=user.id)
    from medframe_apps.accounts.session_completion import routine_sign_in

    return routine_sign_in(request, user, realm)


def start_challenge(request, user, realm: SessionRealm, *, remember=False, shared_device=False):
    if not isinstance(remember, bool) or not isinstance(shared_device, bool):
        raise DomainError("INVALID_INPUT", "Choose whether to stay logged in.")
    ClinicalSession.objects.filter(session_key=request.session.session_key).update(revoked=True)
    logout(request)
    request.session.cycle_key()
    request.session["challenge_realm"] = realm
    request.session["challenge_user"] = str(user.id)
    request.session["challenge_epoch"] = user.auth_epoch
    request.session["challenge_expires"] = time.time() + 300
    request.session["challenge_remember"] = remember
    request.session["challenge_shared"] = shared_device
    request.session.set_expiry(300)


def challenge_user(request, *, realm: SessionRealm = "staff"):
    if request.session.get("challenge_realm", "staff") != realm:
        raise DomainError("FORBIDDEN", "Use the original sign-in workspace.", 403)
    identifier = request.session.get("challenge_user")
    if not identifier or request.session.get("challenge_expires", 0) <= time.time():
        raise DomainError("UNAUTHENTICATED", "Your sign-in expired. Sign in again.", 401)
    user = User.objects.select_for_update().filter(id=identifier, is_active=True).first()
    if user is None or user.auth_epoch != request.session.get("challenge_epoch"):
        raise DomainError("UNAUTHENTICATED", "Your sign-in expired. Sign in again.", 401)
    return user


@transaction.atomic
def enroll(request, *, realm: SessionRealm = "staff"):
    user = challenge_user(request, realm=realm)
    credential, _ = MfaCredential.objects.get_or_create(
        user=user,
        defaults={"encrypted_secret": cipher().encrypt(pyotp.random_base32().encode()).decode()},
    )
    if credential.confirmed:
        raise DomainError("MFA_ALREADY_ENROLLED", "Use your existing authenticator to continue.")
    secret = cipher().decrypt(credential.encrypted_secret.encode()).decode()
    return pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="Medframe")


@transaction.atomic
def verify_mfa(
    request,
    code,
    *,
    realm: SessionRealm = "staff",
    activation: SessionActivation | None = None,
    trust_browser=False,
):
    if not isinstance(trust_browser, bool):
        raise DomainError("INVALID_INPUT", "Choose whether to remember this browser.")
    user = challenge_user(request, realm=realm)
    if activation is not None:
        activation.prepare(user, request)
    credential = MfaCredential.objects.select_for_update().filter(user=user).first()
    if credential is None or not isinstance(code, str) or len(code) > 32:
        raise DomainError("INVALID_MFA", "Set up your authenticator before continuing.", 401)
    code = code.strip()
    secret = cipher().decrypt(credential.encrypted_secret.encode()).decode()
    current_step = int(time.time()) // 30
    step = None
    if re.fullmatch(r"[0-9]{6}", code):
        step = next(
            (
                value
                for value in [current_step - 1, current_step, current_step + 1]
                if value > credential.last_step
                and hmac.compare_digest(pyotp.TOTP(secret).at(value * 30), code)
            ),
            None,
        )
    recovery = None
    if step is None and credential.confirmed:
        recovery = (
            RecoveryCode.objects.select_for_update()
            .filter(user=user, code_hash=digest(code), consumed=False)
            .first()
        )
    if step is None and recovery is None:
        raise DomainError(
            "INVALID_MFA", "That code is invalid or already used. Try a new code.", 401
        )
    if recovery:
        recovery.consumed = True
        recovery.save(update_fields=["consumed"])
    codes = None
    if not credential.confirmed:
        codes = [secrets.token_hex(8) for _ in range(10)]
        RecoveryCode.objects.bulk_create(
            [RecoveryCode(user=user, code_hash=digest(value)) for value in codes]
        )
    credential.confirmed = True
    if step is not None:
        credential.last_step = step
    credential.save()
    if activation is not None:
        activation.complete(user, request)
    from medframe_apps.accounts.google_signin import complete_google_link

    complete_google_link(request, user, realm)
    from medframe_apps.accounts.session_completion import complete_session
    from medframe_apps.accounts.sign_in_policy import (
        effective_policy,
        remember_browser,
        shared_browser,
    )

    if trust_browser and realm == "staff" and activation is None and not shared_browser(request):
        policy = effective_policy(user)
        if policy.mode == "remember" and request.session.get("challenge_trust_eligible") is True:
            remember_browser(request, user, policy)
            audit(user, "auth.browser_remembered", resource_id=user.id)
    complete_session(request, user, realm)
    return codes


@transaction.atomic
def request_password_reset(email, *, realm: SessionRealm = "staff"):
    if not get_settings().recovery_enabled:
        return
    if not isinstance(email, str) or len(email) > 320:
        raise DomainError("INVALID_INPUT", "Check your email address.")
    user = (
        User.objects.select_for_update().filter(email=email.strip().lower(), is_active=True).first()
    )
    if user is None:
        raise DomainError(
            "ACCOUNT_NOT_FOUND",
            "No active Medframe account uses this email. Check the address or contact your clinic.",
            404,
        )
    PasswordReset.objects.filter(user=user, consumed=False).update(consumed=True)
    token = secrets.token_urlsafe(32)
    PasswordReset.objects.create(
        user=user,
        realm=realm,
        token_hash=digest(token),
        expires_at=timezone.now() + timedelta(minutes=15),
    )
    reset_path = "/auth/reset" if realm == "staff" else "/portal/reset"
    payload = {
        "recipient": user.email,
        "link": f"{get_settings().web_origin}{reset_path}#token={token}",
    }
    MailOutbox.objects.create(
        encrypted_payload=cipher().encrypt(json.dumps(payload).encode()).decode(),
        available_at=timezone.now(),
    )
    audit(user, "auth.recovery.requested", resource_id=user.id)


@transaction.atomic
def reset_password(token, password, *, realm: SessionRealm = "staff"):
    if (
        not isinstance(token, str)
        or len(token) > 128
        or not isinstance(password, str)
        or not 15 <= len(password) <= 128
    ):
        raise DomainError(
            "INVALID_INPUT", "Use a valid reset link and a password of 15–128 characters."
        )
    pending = PasswordReset.objects.filter(token_hash=digest(token), realm=realm).first()
    user = User.objects.select_for_update().filter(id=pending.user_id).first() if pending else None
    reset = (
        PasswordReset.objects.select_for_update().filter(id=pending.id).first() if pending else None
    )
    if user is None or not user.is_active or reset.consumed or reset.expires_at <= timezone.now():
        raise DomainError(
            "INVALID_RESET", "This reset link is invalid or expired. Request another."
        )
    try:
        validate_password(password, user)
    except ValidationError:
        raise DomainError(
            "INVALID_PASSWORD", "Choose a longer, less common password unrelated to your account."
        ) from None
    user.set_password(password)
    user.auth_epoch += 1
    user.save()
    PasswordReset.objects.filter(user=user, consumed=False).update(consumed=True)
    ClinicalSession.objects.filter(user=user, revoked=False).update(revoked=True)
    audit(user, "auth.password_reset", resource_id=user.id)
