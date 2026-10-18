import hmac
import json
import re
import secrets
import time
from datetime import timedelta

import pyotp
from django.contrib.auth import authenticate, login, logout
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
from medframe_apps.auditing.services import audit


@transaction.atomic
def begin_login(request, email, password):
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
    logout(request)
    request.session.cycle_key()
    request.session["challenge_user"] = str(user.id)
    request.session["challenge_epoch"] = user.auth_epoch
    request.session["challenge_expires"] = time.time() + 300
    request.session.set_expiry(300)
    audit(user, "auth.password_verified", resource_id=user.id)
    return (
        "verify" if MfaCredential.objects.filter(user=user, confirmed=True).exists() else "enroll"
    )


def challenge_user(request):
    identifier = request.session.get("challenge_user")
    if not identifier or request.session.get("challenge_expires", 0) <= time.time():
        raise DomainError("UNAUTHENTICATED", "Your sign-in expired. Sign in again.", 401)
    user = User.objects.select_for_update().filter(id=identifier, is_active=True).first()
    if user is None or user.auth_epoch != request.session.get("challenge_epoch"):
        raise DomainError("UNAUTHENTICATED", "Your sign-in expired. Sign in again.", 401)
    return user


@transaction.atomic
def enroll(request):
    user = challenge_user(request)
    credential, _ = MfaCredential.objects.get_or_create(
        user=user,
        defaults={"encrypted_secret": cipher().encrypt(pyotp.random_base32().encode()).decode()},
    )
    if credential.confirmed:
        raise DomainError("MFA_ALREADY_ENROLLED", "Use your existing authenticator to continue.")
    secret = cipher().decrypt(credential.encrypted_secret.encode()).decode()
    return pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="Medframe")


@transaction.atomic
def verify_mfa(request, code):
    user = challenge_user(request)
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
    request.session.flush()
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    request.session["mfa_verified"] = True
    request.session.set_expiry(8 * 3600)
    request.session.save()
    now = timezone.now()
    ClinicalSession.objects.create(
        user=user,
        session_key=request.session.session_key,
        expires_at=now + timedelta(hours=8),
        last_seen_at=now,
    )
    audit(user, "auth.mfa_verified", resource_id=user.id)
    return codes


@transaction.atomic
def request_password_reset(email):
    if not get_settings().recovery_enabled:
        return
    if not isinstance(email, str) or len(email) > 320:
        raise DomainError("INVALID_INPUT", "Check your email address.")
    user = (
        User.objects.select_for_update().filter(email=email.strip().lower(), is_active=True).first()
    )
    if user is None:
        return
    PasswordReset.objects.filter(user=user, consumed=False).update(consumed=True)
    token = secrets.token_urlsafe(32)
    PasswordReset.objects.create(
        user=user, token_hash=digest(token), expires_at=timezone.now() + timedelta(minutes=15)
    )
    payload = {
        "recipient": user.email,
        "link": f"{get_settings().web_origin}/auth/reset#token={token}",
    }
    MailOutbox.objects.create(
        encrypted_payload=cipher().encrypt(json.dumps(payload).encode()).decode(),
        available_at=timezone.now(),
    )
    audit(user, "auth.recovery.requested", resource_id=user.id)


@transaction.atomic
def reset_password(token, password):
    if (
        not isinstance(token, str)
        or len(token) > 128
        or not isinstance(password, str)
        or not 15 <= len(password) <= 128
    ):
        raise DomainError(
            "INVALID_INPUT", "Use a valid reset link and a password of 15–128 characters."
        )
    pending = PasswordReset.objects.filter(token_hash=digest(token)).first()
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
