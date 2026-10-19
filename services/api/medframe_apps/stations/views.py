import secrets
from uuid import UUID

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_POST
from pydantic import ValidationError

from config.errors import DomainError
from config.middleware import domain_view, json_object
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.accounts.throttling import throttle
from medframe_apps.organizations.models import Branch
from medframe_apps.stations import handoffs, ownership, pairing
from medframe_apps.stations.context import DEVICE_COOKIE, EDITOR_COOKIE, digest
from medframe_apps.stations.inputs import DeviceInput, OfferInput
from medframe_apps.stations.middleware import heartbeat
from medframe_apps.stations.models import DeviceCredential, StationDevice
from medframe_apps.stations.policy import administrator


def identifier(data, key):
    return UUID(str(data[key]))


def parsed(model, value):
    try:
        return model.model_validate(value)
    except ValidationError:
        raise DomainError(
            "INVALID_INPUT", "Check the submitted fields and their lengths."
        ) from None


def cookie(response, name, secret):
    response.set_cookie(
        name,
        secret,
        max_age=30 * 24 * 3600,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="Strict",
        path="/",
    )
    return response


@require_POST
@domain_view
def context(request):
    credential = getattr(request, "station_credential", None)
    result = {"paired": False, "device": None, "error": None}
    if credential:
        device = credential.device
        if not credential.revoked and credential.expires_at > timezone.now():
            result = {
                "paired": device.state == "active",
                "device": {
                    "name": device.name,
                    "mode": device.mode,
                    "state": device.state,
                    "functions": device.functions,
                    "verification_phrase": credential.verification_phrase,
                    "organization_id": str(device.organization_id),
                    "branch": device.branch.name,
                },
                "error": getattr(request, "station_error", None).message
                if getattr(request, "station_error", None)
                else None,
            }
            if device.state == "active":
                heartbeat(credential)
        else:
            result["error"] = "This device has expired or been revoked. Pair it again with staff."
    elif request.COOKIES.get(DEVICE_COOKIE):
        result["error"] = "This device credential is unavailable. Pair it again with staff."
    response = JsonResponse(result)
    if not request.COOKIES.get(EDITOR_COOKIE):
        cookie(response, EDITOR_COOKIE, secrets.token_urlsafe(32))
    return response


@require_POST
@domain_view
def pair(request):
    data = json_object(request)
    throttle(request, "station.pair", digest(str(data.get("code", ""))), 5, 300)
    if request.user.is_authenticated:
        raise DomainError(
            "SIGN_OUT_REQUIRED",
            "Sign out of patient or staff access before pairing this device.",
            409,
        )
    secret, credential = pairing.redeem(request, data.get("code", ""))
    return cookie(JsonResponse({"state": "pending"}), DEVICE_COOKIE, secret)


@require_POST
@domain_view
def manage(request):
    data = json_object(request)
    organization_id = identifier(data, "organization_id")
    member = administrator(request, organization_id)
    throttle(request, "station.manage", str(request.user.id), 90, 60)
    action = data.get("action", "list")
    if action == "list":
        query = StationDevice.objects.select_related("branch").filter(
            organization_id=organization_id
        )
        branches = Branch.objects.filter(organization_id=organization_id)
        if member.branch_id:
            query = query.filter(branch_id=member.branch_id)
            branches = branches.filter(id=member.branch_id)
        rows = []
        for device in query.order_by("-created_at")[:200]:
            credential = (
                DeviceCredential.objects.filter(
                    device=device, revoked=False, expires_at__gt=timezone.now()
                )
                .order_by("-created_at")
                .first()
            )
            row = pairing.device_data(device)
            row["verification_phrase"] = credential.verification_phrase if credential else None
            rows.append(row)
        return JsonResponse(
            {
                "devices": rows,
                "branches": [{"id": str(b.id), "name": b.name} for b in branches],
            }
        )
    if action == "create":
        device = pairing.create(request, organization_id, parsed(DeviceInput, data["device"]))
        return JsonResponse({"device": pairing.device_data(device)})
    return JsonResponse(
        pairing.manage(
            request,
            organization_id,
            identifier(data, "device_id"),
            action,
            data["expected_version"],
        )
    )


@require_POST
@domain_view
def encounter(request):
    data = json_object(request)
    require_session_realm(request, "staff")
    throttle(request, "station.editor", str(request.user.id), 180, 60)
    org, encounter_id = identifier(data, "organization_id"), identifier(data, "encounter_id")
    action = data.get("action", "status")
    if action == "visit":
        from medframe_apps.encounters.services import require_encounter
        from medframe_apps.operations.models import QueueTicket

        row = require_encounter(request.user, org, encounter_id)
        tickets = QueueTicket.objects.filter(encounter=row).select_related("resource")
        return JsonResponse(
            {
                "tickets": [
                    {
                        "number": t.number,
                        "status": t.status,
                        "counter": t.resource.name if t.resource else "",
                        "issued_at": t.created_at.isoformat(),
                    }
                    for t in tickets
                ]
            }
        )
    if action == "providers":
        from medframe_apps.encounters.services import require_encounter

        row = require_encounter(request.user, org, encounter_id)
        return JsonResponse(
            {
                "providers": [
                    {"id": str(p.id), "name": p.membership.user.display_name}
                    for p in handoffs.providers_for(row).exclude(membership__user=request.user)
                ]
            }
        )
    return JsonResponse(ownership.status(request, org, encounter_id, action))


@require_POST
@domain_view
def handoff(request):
    data = json_object(request)
    require_session_realm(request, "staff")
    throttle(request, "station.handoff", str(request.user.id), 30, 300)
    action = data.get("action")
    if action in {"preview", "accept"}:
        throttle(request, "station.handoff.code", str(request.user.id), 10, 300)
        result = (
            handoffs.preview(request, data.get("code", ""))
            if action == "preview"
            else handoffs.accept(request, data.get("code", ""))
        )
        return JsonResponse(result)
    org, encounter_id = identifier(data, "organization_id"), identifier(data, "encounter_id")
    if action == "offer":
        return JsonResponse(
            handoffs.offer(request, org, encounter_id, parsed(OfferInput, data["handoff"]))
        )
    if action == "cancel":
        handoffs.cancel(request, org, encounter_id, identifier(data, "handoff_id"))
        return JsonResponse({"ok": True})
    raise DomainError("INVALID_INPUT", "Choose offer, preview, accept or cancel.")
