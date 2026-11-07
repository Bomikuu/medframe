from datetime import timedelta

from django.contrib.auth import logout
from django.utils import timezone

from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.accounts.sign_in_policy import (
    apply_trust_cookie,
    authenticated_session,
    clinical_assurance_valid,
)


class ClinicalSessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.native_session_key = request.session.session_key
        request.native_last_seen_at = None
        if request.user.is_authenticated:
            now = timezone.now()
            session = (
                ClinicalSession.objects.select_related("user", "trusted_browser")
                .filter(
                    user=request.user,
                    session_key=request.session.session_key,
                    revoked=False,
                    expires_at__gt=now,
                    last_seen_at__gt=now - timedelta(minutes=30),
                )
                .first()
            )
            if (
                not authenticated_session(request.user, request.session)
                or session is None
                or request.session.get("auth_realm", "staff") != session.realm
                or not clinical_assurance_valid(session)
            ):
                ClinicalSession.objects.filter(session_key=request.native_session_key).update(
                    revoked=True
                )
                logout(request)
            else:
                request.native_last_seen_at = session.last_seen_at
                ClinicalSession.objects.filter(id=session.id, revoked=False).update(
                    last_seen_at=now
                )
        return apply_trust_cookie(request, self.get_response(request))
