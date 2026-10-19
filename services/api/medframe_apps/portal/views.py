from django.http import JsonResponse
from django.views.decorators.http import require_POST

from config.middleware import domain_view, json_object
from medframe_apps.accounts import services
from medframe_apps.accounts.throttling import refund_attempt, throttle
from medframe_apps.portal.invitations import PortalActivation, prepare_invitation
from medframe_apps.portal.policy import eligible_patient


@require_POST
@domain_view
def login(request):
    data = json_object(request)
    email = str(data.get("email", "")).strip().lower()
    throttle(request, "portal-login", email, 5, 900)
    step = services.begin_login(
        request,
        email,
        data.get("password", ""),
        realm="patient",
        eligibility=eligible_patient,
        remember=data.get("remember", False),
    )
    refund_attempt(request, "portal-login", email)
    return JsonResponse({"nextStep": step})


@require_POST
@domain_view
def prepare(request):
    data = json_object(request)
    throttle(request, "portal-prepare", str(data.get("token", "")), 5, 900)
    step = prepare_invitation(
        request, data.get("token", ""), data.get("password", ""), data.get("displayName", "")
    )
    return JsonResponse({"nextStep": step})


@require_POST
@domain_view
def enroll(request):
    return JsonResponse({"otpauthUri": services.enroll(request, realm="patient")})


@require_POST
@domain_view
def verify(request):
    identity = request.session.session_key or "missing"
    throttle(request, "portal-mfa", identity, 5, 300)
    codes = services.verify_mfa(
        request,
        json_object(request).get("code", ""),
        realm="patient",
        activation=PortalActivation(),
    )
    refund_attempt(request, "portal-mfa", identity)
    return JsonResponse({"nextStep": "authenticated", "recoveryCodes": codes})


@require_POST
@domain_view
def recover(request):
    email = json_object(request).get("email", "")
    throttle(request, "recovery", str(email).strip().lower(), 3, 3600)
    services.request_password_reset(email, realm="patient")
    return JsonResponse({"message": "If an active account matches, a reset link will be sent."})


@require_POST
@domain_view
def reset(request):
    from django.contrib.auth import logout

    data = json_object(request)
    throttle(request, "reset", str(data.get("token", "")), 5, 900)
    services.reset_password(data.get("token", ""), data.get("password", ""), realm="patient")
    logout(request)
    return JsonResponse({"ok": True})
