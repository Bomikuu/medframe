from datetime import date
from uuid import UUID

from django.conf import settings
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_POST

from config.errors import DomainError
from config.middleware import domain_view, json_object
from medframe_apps.accounts.throttling import throttle
from medframe_apps.stations import kiosk_reception as reception
from medframe_apps.stations import kiosk_services as services
from medframe_apps.stations.kiosk_identity import (
    IDLE_SECONDS,
    PATIENT_COOKIE,
    kiosk_device,
    patient_session,
    redeem,
    session_summary,
)
from medframe_apps.stations.models import (
    KioskBoundary,
    KioskIntake,
    KioskPatientSession,
    StationDepartment,
)


def private_response(data):
    response = JsonResponse(data)
    response["Cache-Control"] = "no-store, private"
    return response


@require_POST
@domain_view
@transaction.atomic
def kiosk(request):
    data = json_object(request)
    action = data.get("action", "setup")
    credential = kiosk_device(request)
    branch = credential.device.branch
    throttle(request, "kiosk.request", str(credential.id), 120, 60)
    if action == "staff_context":
        from medframe_apps.operations.policy import require_operations

        require_operations(request, branch.organization_id, "appointments.manage", branch.id)
        return private_response(
            {
                "organization_id": str(branch.organization_id),
                "branch_id": str(branch.id),
                "staff": request.user.display_name,
                "timezone": branch.organization.timezone,
                "kiosks": reception.devices(branch),
            }
        )
    if action == "setup":
        boundary, _ = KioskBoundary.objects.get_or_create(credential=credential)
        return private_response(
            {
                "clinic": branch.organization.name,
                "branch": branch.name,
                "timezone": branch.organization.timezone,
                "functions": credential.device.functions,
                "departments": [
                    services.department_summary(row)
                    for row in StationDepartment.objects.filter(
                        branch=branch, active=True
                    ).order_by("name")
                ],
                "providers": [
                    {
                        "id": str(row.id),
                        "name": row.membership.user.display_name,
                        "specialty": row.specialty,
                    }
                    for row in services.providers(branch)
                ],
                "idle_seconds": IDLE_SECONDS,
                "generation": boundary.generation,
                "strict_verification": reception.strict(credential.device),
            }
        )
    if action in {"verify", "receive", "identify", "staff_select"}:
        if action in {"identify", "staff_select"}:
            from medframe_apps.stations.kiosk_terminal import open_terminal

            opened = open_terminal(request, credential, data, staff=action == "staff_select")
        elif action == "verify":
            if not reception.strict(credential.device):
                raise DomainError(
                    "RECEPTION_REQUIRED",
                    "Reception selects your patient session on this kiosk.",
                    403,
                )
            opened = redeem(request, data.get("code", ""), int(data["generation"]))
        else:
            opened = reception.receive(request, int(data["generation"]))
        if not opened:
            return private_response({"session": None})
        secret, session = opened
        response = private_response(
            {"session": session_summary(session)}
            if action == "receive"
            else session_summary(session)
        )
        response.set_cookie(
            PATIENT_COOKIE,
            secret,
            max_age=600,
            httponly=True,
            secure=settings.SESSION_COOKIE_SECURE,
            samesite="Strict",
            path="/",
        )
        return response
    if action == "end":
        boundary, _ = KioskBoundary.objects.get_or_create(credential=credential)
        boundary = KioskBoundary.objects.select_for_update().get(pk=boundary.pk)
        boundary.generation += 1
        boundary.save(update_fields=["generation"])
        KioskPatientSession.objects.filter(credential=credential, ended_at__isnull=True).update(
            ended_at=timezone.now()
        )
        response = private_response({"ended": True})
        response.delete_cookie(PATIENT_COOKIE, path="/", samesite="Strict")
        return response
    if action == "register":
        throttle(request, "kiosk.intake", str(credential.id), 5, 300)
        name = str(data.get("full_name", "")).strip()
        phone = str(data.get("phone", "")).strip()
        birth = date.fromisoformat(data["date_of_birth"]) if data.get("date_of_birth") else None
        if (
            not 1 <= len(name) <= 160
            or not 5 <= len(phone) <= 40
            or (birth and birth > timezone.localdate())
        ):
            raise DomainError(
                "INVALID_INPUT", "Enter your name, contact number and a valid optional birth date."
            )
        request_id = UUID(str(data["request_id"]))
        row, created = KioskIntake.objects.get_or_create(
            credential=credential,
            request_id=request_id,
            defaults={"full_name": name, "phone": phone, "date_of_birth": birth},
        )
        if not created and (row.full_name, row.phone, row.date_of_birth) != (name, phone, birth):
            raise DomainError("CONFLICT", "This request changed. Ask reception to review it.", 409)
        return private_response(
            {
                "kind": "intake",
                "reference": str(row.id)[:8].upper(),
                "message": (
                    "Your registration request is ready for reception. Staff must verify it "
                    "before linking or creating a patient record."
                ),
            }
        )
    if action in {"book", "check_in", "walk_in", "cashier"}:
        return private_response(services.perform(request, data))
    session = patient_session(
        request,
        lock=True,
        function="booking" if action == "slots" else "payments" if action == "balances" else None,
    )
    if action == "status":
        return private_response({**session_summary(session), **services.patient_snapshot(session)})
    if action == "activity":
        session.last_active_at = timezone.now()
        session.save(update_fields=["last_active_at"])
        return private_response(session_summary(session))
    if action == "slots":
        return private_response({"slots": services.available(session, data)})
    if action == "balances":
        return private_response(services.balances(session))
    raise DomainError("INVALID_INPUT", "Choose an available kiosk task.")
