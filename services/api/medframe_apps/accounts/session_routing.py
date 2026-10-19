"""Navigation hints only; domain endpoints still authorize every operation."""

from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def session_route(request):
    authenticated = bool(request.user.is_authenticated and request.session.get("mfa_verified"))
    kind, destination = "anonymous", "/login"
    credential = getattr(request, "station_credential", None)
    if getattr(request, "station_error", None):
        kind, destination = "device", "/station"
    elif credential and credential.device.mode in {"kiosk", "display"}:
        kind = "device"
        destination = "/station/kiosk" if credential.device.mode == "kiosk" else "/station"
    elif authenticated:
        doctor = getattr(request, "station_doctor", None)
        access = getattr(request, "station_access", None)
        if doctor:
            kind = "doctor"
            destination = f"/station/clinician?organization={doctor.code.organization_id}"
        elif access:
            kind = "handoff"
            encounter = access.handoff.encounter
            destination = (
                f"/station/clinician/consultations/{encounter.id}"
                f"?organization={encounter.organization_id}"
            )
        elif request.session.get("auth_realm", "staff") == "patient":
            kind, destination = "patient", "/portal"
        else:
            kind, destination = "staff", "/clinic"
    elif credential:
        kind, destination = "device", "/station"
    response = JsonResponse(
        {
            "authenticated": authenticated,
            "kind": kind,
            "destination": destination,
        }
    )
    response["Cache-Control"] = "no-store, private"
    return response
