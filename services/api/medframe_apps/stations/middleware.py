from django.http import JsonResponse
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.stations.context import DEVICE_COOKIE, current_request
from medframe_apps.stations.context import digest as token_digest
from medframe_apps.stations.models import DeviceCredential, StationDevice


class StationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from medframe_apps.stations.access import find_session, live

        access = find_session(getattr(request, "native_session_key", request.session.session_key))
        request.station_access = access
        request.station_credential = None
        request.station_error = None
        secret = request.COOKIES.get(DEVICE_COOKIE)
        if secret:
            credential = (
                DeviceCredential.objects.select_related("device")
                .filter(digest=token_digest(secret))
                .first()
            )
            request.station_credential = credential
            if not credential or credential.revoked or credential.expires_at <= timezone.now():
                request.station_error = DomainError(
                    "DEVICE_UNAVAILABLE",
                    "This device has expired or been revoked. Contact staff.",
                    403,
                )
            elif credential.device.state != "active":
                request.station_error = DomainError(
                    "DEVICE_UNAVAILABLE", "This device needs clinic approval.", 403
                )
        protected = request.path == "/graphql" or request.path.startswith(
            ("/documents/", "/diagnostics/", "/portal/", "/onboarding/", "/admin/")
        )
        credential = request.station_credential
        if access:
            # Native middleware refreshed last_seen; validate its previous timestamp
            # so Station's shorter inactivity policy cannot be extended by a poll.
            previous = getattr(request, "native_last_seen_at", None)
            if previous:
                access.session.last_seen_at = previous
            if not request.user.is_authenticated or not live(access, credential):
                from django.contrib.auth import logout

                from medframe_apps.accounts.models import ClinicalSession

                ClinicalSession.objects.filter(id=access.session_id).update(revoked=True)
                logout(request)
                if request.path not in {
                    "/auth/csrf",
                    "/auth/logout",
                    "/stations/context",
                    "/stations/access",
                }:
                    return JsonResponse(
                        {
                            "code": "STATION_EXPIRED",
                            "message": "This Station session ended. "
                            "Ask the clinician for a new code.",
                        },
                        status=403,
                    )
                request.station_access = None
            elif request.path not in {
                "/graphql",
                "/auth/csrf",
                "/auth/logout",
                "/stations/context",
                "/stations/encounter",
                "/documents/download",
            } and not request.path.startswith("/documents/upload/"):
                return JsonResponse(
                    {
                        "code": "STATION_SCOPE",
                        "message": "This session opens only its assigned consultation.",
                    },
                    status=403,
                )
        if protected and (
            request.station_error
            or (credential and credential.device.mode != "clinician")
            or (credential and "clinical.read" not in credential.device.functions)
        ):
            error = request.station_error or DomainError(
                "DEVICE_MODE", "Use a named staff workstation for this task.", 403
            )
            return JsonResponse({"code": error.code, "message": error.message}, status=error.status)
        token = current_request.set(request)
        try:
            return self.get_response(request)
        finally:
            current_request.reset(token)


def heartbeat(credential):
    StationDevice.objects.filter(id=credential.device_id).update(last_seen_at=timezone.now())
