"""Effective clinic requirements and revocable second-factor browser proof."""

import hashlib
import json
import secrets
from dataclasses import dataclass
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from config.crypto import digest
from medframe_apps.accounts.models import ClinicalSession, TrustedBrowser
from medframe_apps.organizations.models import Membership, OrganizationSignInPolicy

TRUST_COOKIE = "medframe_trusted_browser"
MODES = {"password": 0, "remember": 1, "strict": 2}


@dataclass(frozen=True)
class EffectivePolicy:
    mode: str
    fingerprint: str


def effective_policy(user):
    members = list(
        Membership.objects.filter(
            user=user,
            active=True,
            organization__active=True,
            roles__permissions__codename="workspace.read",
        )
        .distinct()
        .order_by("id")
        .values("id", "organization_id", "branch_id")
    )
    policies = {
        row.organization_id: row
        for row in OrganizationSignInPolicy.objects.filter(
            organization_id__in=[member["organization_id"] for member in members]
        )
    }
    privileged = bool(
        user.is_staff
        or user.is_superuser
        or Membership.objects.filter(
            user=user, active=True, organization__active=True, roles__name="platform_administrator"
        ).exists()
    )
    modes, state = [], []
    for member in members:
        row = policies.get(member["organization_id"])
        mode, revision = (row.mode, row.revision) if row else ("strict", 0)
        modes.append(mode)
        state.append(
            [
                str(member["id"]),
                str(member["organization_id"]),
                str(member["branch_id"]),
                mode,
                revision,
            ]
        )
    mode = (
        "strict" if privileged or not modes else max(modes, key=lambda value: MODES.get(value, 2))
    )
    fingerprint = hashlib.sha256(
        json.dumps([privileged, state], separators=(",", ":")).encode()
    ).hexdigest()
    return EffectivePolicy(mode, fingerprint)


def clinical_assurance_valid(row):
    """Also used on delegated source sessions, without traffic from the source browser."""
    if row.auth_method == "mfa":
        return True
    if row.realm != "staff" or row.auth_method not in {"password", "trusted"}:
        return False
    user = row.user
    policy = effective_policy(user)
    if (
        not user.is_active
        or row.auth_epoch != user.auth_epoch
        or row.policy_fingerprint != policy.fingerprint
    ):
        return False
    if row.auth_method == "password":
        return policy.mode == "password"
    browser = row.trusted_browser
    return bool(
        policy.mode == "remember"
        and browser
        and not browser.revoked
        and browser.user_id == user.id
        and browser.auth_epoch == user.auth_epoch
        and browser.policy_fingerprint == policy.fingerprint
        and browser.expires_at > timezone.now()
    )


def authenticated_session(user, session):
    if not user.is_authenticated or not user.is_active:
        return False
    if session.get("mfa_verified") is True:
        return True
    if session.get("auth_verified") is not True or session.get("auth_realm") != "staff":
        return False
    key = getattr(session, "session_key", None)
    row = (
        ClinicalSession.objects.select_related("user", "trusted_browser")
        .filter(
            user=user,
            session_key=key,
            realm="staff",
            revoked=False,
            expires_at__gt=timezone.now(),
            last_seen_at__gt=timezone.now() - timedelta(minutes=30),
        )
        .first()
        if key
        else None
    )
    return bool(row and clinical_assurance_valid(row))


def shared_browser(request):
    return bool(
        request.session.get("challenge_shared")
        or request.headers.get("X-Medframe-Workspace") == "station"
        or request.COOKIES.get("medframe_device")
    )


def current_trust(request, user, policy):
    secret = request.COOKIES.get(TRUST_COOKIE, "")
    if shared_browser(request) or len(secret) != 43:
        return None
    row = (
        TrustedBrowser.objects.select_for_update()
        .filter(
            token_hash=digest(secret),
            user=user,
            revoked=False,
            expires_at__gt=timezone.now(),
            auth_epoch=user.auth_epoch,
            policy_fingerprint=policy.fingerprint,
        )
        .first()
    )
    if row:
        # Rotate the secret after successful first-factor proof; keep the original deadline.
        replacement = secrets.token_urlsafe(32)
        row.token_hash = digest(replacement)
        row.save(update_fields=["token_hash"])
        request.trust_cookie = (replacement, row.expires_at)
    return row


def forget_browser(request):
    secret = request.COOKIES.get(TRUST_COOKIE, "")
    if len(secret) == 43:
        rows = TrustedBrowser.objects.filter(token_hash=digest(secret))
        ClinicalSession.objects.filter(trusted_browser__in=rows, auth_method="trusted").update(
            revoked=True
        )
        rows.update(revoked=True)
    request.clear_trust_cookie = True


def remember_browser(request, user, policy):
    forget_browser(request)
    secret = secrets.token_urlsafe(32)
    expires = timezone.now() + timedelta(days=30)
    row = TrustedBrowser.objects.create(
        user=user,
        token_hash=digest(secret),
        auth_epoch=user.auth_epoch,
        policy_fingerprint=policy.fingerprint,
        expires_at=expires,
    )
    request.trust_cookie = (secret, expires)
    return row


def apply_trust_cookie(request, response):
    if response.status_code >= 400:
        return response
    proof = getattr(request, "trust_cookie", None)
    if proof:
        secret, expires = proof
        response.set_cookie(
            TRUST_COOKIE,
            secret,
            max_age=max(1, int((expires - timezone.now()).total_seconds())),
            httponly=True,
            secure=settings.SESSION_COOKIE_SECURE,
            samesite="Strict",
            path="/",
        )
    elif getattr(request, "clear_trust_cookie", False):
        response.delete_cookie(TRUST_COOKIE, path="/", samesite="Strict")
    return response
