"""Clinic-scoped settings, reauthentication and attributed policy changes."""

from uuid import UUID

from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_POST

from config.errors import DomainError
from config.middleware import domain_view, json_object
from medframe_apps.accounts.models import ClinicalSession, TrustedBrowser, User
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.accounts.sign_in_policy import (
    MODES,
    TRUST_COOKIE,
    effective_policy,
    forget_browser,
)
from medframe_apps.accounts.throttling import refund_attempt, throttle
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version
from medframe_apps.organizations.models import Membership, Organization, OrganizationSignInPolicy
from medframe_apps.organizations.policy import require_membership


def administrator(request, organization_id):
    require_session_realm(request, "staff")
    if (
        getattr(request, "station_access", None)
        or getattr(request, "station_doctor", None)
        or getattr(request, "station_credential", None)
        or request.headers.get("X-Medframe-Workspace") == "station"
    ):
        raise DomainError(
            "FORBIDDEN", "Manage clinic security from your own clinic workspace.", 403
        )
    member = require_membership(request.user, UUID(str(organization_id)), "organization.manage")
    return member


def snapshot(request, member):
    policy = OrganizationSignInPolicy.objects.filter(organization=member.organization).first()
    effective = effective_policy(request.user)
    return {
        "organization": member.organization.name,
        "mode": policy.mode if policy else "strict",
        "revision": policy.revision if policy else 0,
        "updated_at": policy.updated_at.isoformat() if policy else None,
        "effective_mode": effective.mode,
        "platform_strict": bool(
            request.user.is_staff
            or request.user.is_superuser
            or Membership.objects.filter(
                user=request.user,
                active=True,
                organization__active=True,
                roles__name="platform_administrator",
            ).exists()
        ),
    }


@require_POST
@domain_view
def manage(request):
    data = json_object(request)
    member = administrator(request, data.get("organization_id"))
    action = data.get("action", "read")
    if action == "read":
        return JsonResponse(snapshot(request, member))
    if action != "update" or data.get("mode") not in MODES or type(data.get("revision")) is not int:
        raise DomainError("INVALID_INPUT", "Choose a sign-in mode and reload the latest settings.")
    password = data.get("password")
    if not isinstance(password, str) or not 1 <= len(password) <= 128:
        raise DomainError(
            "PASSWORD_REQUIRED", "Enter your current password to confirm this change."
        )
    throttle(request, "security.policy.password", str(request.user.id), 5, 900)
    with transaction.atomic():
        user = User.objects.select_for_update().get(id=request.user.id)
        if not user.check_password(password):
            raise DomainError(
                "INVALID_PASSWORD", "Your current password is incorrect. Try again.", 403
            )
        # Lock the organization even before its first policy row exists.
        Organization.objects.select_for_update().get(id=member.organization_id)
        member = administrator(request, member.organization_id)
        row = OrganizationSignInPolicy.objects.filter(organization=member.organization).first()
        check_version(row.revision if row else 0, data["revision"])
        if not row or row.mode != data["mode"]:
            if row:
                row.mode, row.revision = data["mode"], row.revision + 1
                row.updated_at, row.updated_by = timezone.now(), user
                row.save(update_fields=["mode", "revision", "updated_at", "updated_by"])
            else:
                row = OrganizationSignInPolicy.objects.create(
                    organization=member.organization,
                    mode=data["mode"],
                    updated_by=user,
                )
            members = Membership.objects.filter(organization=member.organization).values("user_id")
            TrustedBrowser.objects.filter(user_id__in=members).update(revoked=True)
            ClinicalSession.objects.filter(
                user_id__in=members, auth_method__in=["password", "trusted"]
            ).update(revoked=True)
            audit(
                user,
                f"organization.sign_in.{row.mode}",
                organization_id=member.organization_id,
                resource_id=row.id,
            )
        result = snapshot(request, member)
        result["sign_in_again"] = request.session.get("mfa_verified") is not True
    refund_attempt(request, "security.policy.password", str(request.user.id))
    return JsonResponse(result)


@require_POST
@domain_view
def browser(request):
    from config.crypto import digest

    data = json_object(request)
    if data.get("action") == "forget":
        forget_browser(request)
        if request.user.is_authenticated:
            audit(request.user, "auth.browser_forgotten", resource_id=request.user.id)
        return JsonResponse(
            {
                "remembered": False,
                "expires_at": None,
                "sign_in_again": request.session.get("auth_method") == "trusted",
            }
        )
    if data.get("action", "status") != "status":
        raise DomainError("INVALID_INPUT", "Choose a supported browser action.")
    secret = request.COOKIES.get(TRUST_COOKIE, "")
    row = (
        TrustedBrowser.objects.select_related("user")
        .filter(
            token_hash=digest(secret),
            revoked=False,
            expires_at__gt=timezone.now(),
        )
        .first()
        if len(secret) == 43
        else None
    )
    valid = bool(
        row
        and row.user.is_active
        and row.auth_epoch == row.user.auth_epoch
        and (not request.user.is_authenticated or request.user.id == row.user_id)
    )
    if valid:
        policy = effective_policy(row.user)
        valid = policy.mode == "remember" and policy.fingerprint == row.policy_fingerprint
    return JsonResponse(
        {"remembered": valid, "expires_at": row.expires_at.isoformat() if valid else None}
    )
