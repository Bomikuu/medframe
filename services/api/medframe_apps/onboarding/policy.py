from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.organizations.models import Membership


def require_platform_admin(request):
    user = require_session_realm(request, "staff")
    if not user.is_active or not (
        user.is_superuser
        or Membership.objects.filter(
            user=user, active=True, organization__active=True, roles__name="platform_administrator"
        ).exists()
    ):
        raise DomainError("FORBIDDEN", "Platform administrator access is required.", 403)
    return user


def invitation_state(invitation):
    if invitation.completed_at:
        return "completed"
    if invitation.revoked_at:
        return "revoked"
    if invitation.expires_at <= timezone.now():
        return "expired"
    if invitation.verified_at:
        return "in_progress"
    return "opened" if invitation.opened_at else "pending"


def require_live(invitation):
    if invitation_state(invitation) in {"expired", "revoked", "completed"}:
        raise DomainError(
            "INVITATION_UNAVAILABLE",
            "This invitation is unavailable or completed. Ask the platform administrator for help.",
            403,
        )
