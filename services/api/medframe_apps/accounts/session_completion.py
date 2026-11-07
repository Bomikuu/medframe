"""One native session owner; MFA proof is distinct from policy-satisfied staff sign-in."""

from datetime import timedelta

from django.contrib.auth import login
from django.utils import timezone

from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.auditing.services import audit


def complete_session(request, user, realm, *, method="mfa", policy=None, trusted_browser=None):
    remember = request.session.get("challenge_remember") is True
    duration = timedelta(days=30) if remember else timedelta(hours=8)
    now = timezone.now()
    expiry = now + duration
    if trusted_browser:
        expiry = min(expiry, trusted_browser.expires_at)
    ClinicalSession.objects.filter(session_key=request.session.session_key).update(revoked=True)
    request.session.flush()
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    request.session.update(
        {
            "mfa_verified": method == "mfa",
            "auth_verified": True,
            "auth_realm": realm,
            "auth_method": method,
        }
    )
    request.session.set_expiry(max(1, int((expiry - now).total_seconds())) if remember else 0)
    request.session.save()
    ClinicalSession.objects.create(
        user=user,
        realm=realm,
        session_key=request.session.session_key,
        last_seen_at=now,
        expires_at=expiry,
        auth_method=method,
        auth_epoch=user.auth_epoch,
        policy_fingerprint=policy.fingerprint if policy else "",
        trusted_browser=trusted_browser,
    )
    audit(user, f"auth.{method}_verified", resource_id=user.id)


def routine_sign_in(request, user, realm, *, allow_reduced=True):
    from medframe_apps.accounts.models import MfaCredential
    from medframe_apps.accounts.sign_in_policy import current_trust, effective_policy

    if realm == "staff" and allow_reduced:
        policy = effective_policy(user)
        if policy.mode == "password":
            complete_session(request, user, realm, method="password", policy=policy)
            return "authenticated"
        if policy.mode == "remember":
            browser = current_trust(request, user, policy)
            if browser:
                complete_session(
                    request, user, realm, method="trusted", policy=policy, trusted_browser=browser
                )
                return "authenticated"
            request.session["challenge_trust_eligible"] = True
    return (
        "verify" if MfaCredential.objects.filter(user=user, confirmed=True).exists() else "enroll"
    )
