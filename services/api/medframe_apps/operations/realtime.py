from datetime import timedelta
from types import SimpleNamespace
from uuid import UUID

from django.contrib.auth import get_user
from django.contrib.sessions.backends.db import SessionStore
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.accounts.sign_in_policy import authenticated_session
from medframe_apps.operations.policy import require_operations
from medframe_apps.portal.policy import require_portal_link


def socket_authority(session_key, params):
    session = SessionStore(session_key=session_key)
    user = get_user(SimpleNamespace(session=session))
    now = timezone.now()
    realm = session.get("auth_realm", "staff")
    if (
        not user.is_authenticated
        or not user.is_active
        or not authenticated_session(user, session)
        or not ClinicalSession.objects.filter(
            user=user,
            session_key=session_key,
            realm=realm,
            revoked=False,
            expires_at__gt=now,
            last_seen_at__gt=now - timedelta(minutes=30),
        ).exists()
    ):
        raise DomainError("UNAUTHENTICATED", "Sign in to continue.", 401)
    request = SimpleNamespace(user=user, session=session)
    if realm == "patient":
        link = require_portal_link(request, UUID(params.get("link", "")))
        return link.patient.branch_id, user.auth_epoch
    org, branch = UUID(params.get("organization", "")), UUID(params.get("branch", ""))
    require_operations(request, org, "operations.read", branch)
    return branch, user.auth_epoch
