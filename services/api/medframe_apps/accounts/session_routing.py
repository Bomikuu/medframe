"""Navigation hints only; domain endpoints still authorize every operation."""

from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def session_route(request):
    from medframe_apps.accounts.sign_in_policy import authenticated_session

    authenticated = authenticated_session(request.user, request.session)
    kind, destination = "anonymous", "/login"
    credential = getattr(request, "station_credential", None)
    if authenticated and request.session.get("auth_realm", "staff") == "staff":
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
        else:
            from medframe_apps.organizations.models import Membership, StaffProfile

            members = Membership.objects.filter(
                user=request.user,
                active=True,
                organization__active=True,
                roles__permissions__codename="workspace.read",
            ).distinct()
            station_ids = StaffProfile.objects.filter(workspace_mode="station").values_list(
                "membership_id", flat=True
            )
            if members.exists() and not members.exclude(id__in=station_ids).exists():
                kind, destination = "station_staff", "/station"
            else:
                kind, destination = "staff", "/clinic"
    elif getattr(request, "station_error", None):
        kind, destination = "device", "/station"
    elif credential and credential.device.mode in {"kiosk", "display"}:
        kind = "device"
        destination = "/station/kiosk" if credential.device.mode == "kiosk" else "/station/display"
    elif authenticated:
        kind, destination = "patient", "/portal"
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
