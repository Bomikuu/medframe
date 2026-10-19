from datetime import timedelta

from django.contrib.auth import logout
from django.utils import timezone

from medframe_apps.accounts.models import ClinicalSession


class ClinicalSessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.native_session_key = request.session.session_key
        request.native_last_seen_at = None
        if request.user.is_authenticated:
            now = timezone.now()
            session = ClinicalSession.objects.filter(
                user=request.user,
                session_key=request.session.session_key,
                revoked=False,
                expires_at__gt=now,
                last_seen_at__gt=now - timedelta(minutes=30),
            ).first()
            if (
                not request.session.get("mfa_verified")
                or session is None
                or request.session.get("auth_realm", "staff") != session.realm
            ):
                logout(request)
            else:
                request.native_last_seen_at = session.last_seen_at
                ClinicalSession.objects.filter(id=session.id, revoked=False).update(
                    last_seen_at=now
                )
        return self.get_response(request)
