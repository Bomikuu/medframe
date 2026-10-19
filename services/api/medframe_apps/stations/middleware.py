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
            ("/documents/", "/diagnostics/", "/portal/", "/onboarding/")
        )
        credential = request.station_credential
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
