from uuid import UUID
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from config.middleware import domain_view, json_object
from medframe_apps.accounts.sign_in_policy import authenticated_session
from medframe_apps.accounts.throttling import throttle
from medframe_apps.operations import call_files, call_service as service
from medframe_apps.operations.call_policy import (
    COOKIE,
    doctor_for,
    live_room,
    participant_for,
    room_for,
    room_access_seconds,
)
from medframe_apps.operations.models import Appointment
from config.errors import DomainError
from medframe_apps.operations.call_policy import media_healthy


@require_GET
def health(request):
    ready = media_healthy()
    return JsonResponse({"ready": ready}, status=200 if ready else 503)


@require_POST
@domain_view
def rooms(request):
    data = json_object(request)
    action = data.get("action", "inspect")
    identifier = data.get("room_id")
    throttle(request, "call.request", str(identifier)[:40], 180, 60)
    if action == "create_instant":
        from config.crypto import cipher
        from medframe_apps.operations.call_instant import create_instant

        row = create_instant(
            request, {key: value for key, value in data.items() if key != "action"}
        )
        return JsonResponse(
            {
                **service.summary(row),
                "appointment_id": str(row.appointment_id),
                "pin": cipher().decrypt(row.pin_display.encode()).decode(),
            }
        )
    if action == "create":
        appointment = Appointment.objects.filter(
            id=UUID(str(data.get("appointment_id", "")))
        ).first()
        if not appointment:
            raise DomainError("NOT_FOUND", "Choose an existing appointment.", 404)
        row = service.create_room(
            request,
            appointment,
            data.get("doctor_mode", "assigned"),
            timing_mode=data.get("timing_mode", "scheduled"),
        )
        return JsonResponse(service.summary(row))
    if action == "inspect":
        row = room_for(identifier)
        live_room(row, window=False)
        value = service.summary(row)
        value["staff_signed_in"] = bool(
            request.user.is_authenticated
            and authenticated_session(request.user, request.session)
            and request.session.get("auth_realm", "staff") == "staff"
        )
        try:
            doctor_for(request, row)
            value["can_join_doctor"] = True
        except DomainError:
            value["can_join_doctor"] = False
        try:
            participant_for(request, identifier, lobby=True)
            value["has_access"] = True
        except DomainError:
            value["has_access"] = False
        return JsonResponse(value)
    if action in {"join_patient", "join_doctor"}:
        throttle(request, "call.pin", str(identifier)[:40], 8, 600)
        row, proof = service.join(
            request, identifier, doctor=action == "join_doctor", pin=data.get("pin", "")
        )
        response = JsonResponse(service.summary(row))
        response.set_cookie(
            COOKIE,
            proof,
            httponly=True,
            secure=settings.SESSION_COOKIE_SECURE,
            samesite="Lax",
            max_age=room_access_seconds(row),
            path="/",
        )
        return response
    if action == "snapshot":
        value = service.snapshot(request, identifier)
        response = JsonResponse(value)
        row = room_for(identifier)
        response.set_cookie(
            COOKIE,
            request.COOKIES[COOKIE],
            httponly=True,
            secure=settings.SESSION_COOKIE_SECURE,
            samesite="Lax",
            max_age=room_access_seconds(row),
            path="/",
        )
        return response
    if action in {"clinical_context", "connect_encounter", "publish_aftercare"}:
        from medframe_apps.operations import call_clinical

        if action == "clinical_context":
            return JsonResponse(call_clinical.context(request, identifier))
        if action == "connect_encounter":
            return JsonResponse(call_clinical.connect_encounter(request, identifier, data))
        return JsonResponse(call_clinical.publish_aftercare(request, identifier, data))
    if action == "readiness":
        return JsonResponse(service.update_readiness(request, identifier, data))
    if action == "message":
        throttle(request, "call.chat", str(identifier), 60, 60)
        return JsonResponse(service.send_message(request, identifier, data))
    if action == "history":
        return JsonResponse(service.history(request, identifier, data.get("before")))
    return JsonResponse(service.room_action(request, identifier, data))


@require_POST
@domain_view
def upload(request, identifier):
    throttle(request, "call.file", str(identifier), 15, 60)
    item = call_files.upload(request, identifier)
    return JsonResponse({"id": str(item.id), "state": item.scan_state})


@require_GET
@domain_view
def download(request, identifier):
    return call_files.download(request, identifier)
