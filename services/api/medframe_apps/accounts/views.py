from django.conf import settings
from django.contrib.auth import logout
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_GET, require_POST

from config.errors import DomainError
from config.middleware import domain_view, json_object
from medframe_apps.accounts import services
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.accounts.throttling import refund_attempt, throttle
from medframe_apps.auditing.services import audit


@require_GET
@domain_view
def csrf(request):
    if request.headers.get("Origin") != settings.WEB_ORIGIN:
        raise DomainError("INVALID_ORIGIN", "Reload this page and try again.", 403)
    return JsonResponse({"csrfToken": get_token(request)})


@require_POST
@domain_view
def login_view(request):
    data = json_object(request)
    identity = data.get("email", "")
    throttle(request, "login", str(identity).strip().lower(), 5, 900)
    next_step = services.begin_login(
        request,
        identity,
        data.get("password", ""),
        remember=data.get("remember", False),
        shared_device=data.get("shared_device", False),
    )
    refund_attempt(request, "login", str(identity).strip().lower())
    from medframe_apps.accounts.sign_in_policy import shared_browser

    return JsonResponse(
        {
            "nextStep": next_step,
            "canRememberBrowser": bool(
                request.session.get("challenge_trust_eligible") and not shared_browser(request)
            ),
        }
    )


@require_POST
@domain_view
def enroll_view(request):
    return JsonResponse({"otpauthUri": services.enroll(request)})


@require_POST
@domain_view
def verify_view(request):
    identity = request.session.session_key or "missing"
    throttle(request, "mfa", identity, 5, 300)
    data = json_object(request)
    codes = services.verify_mfa(
        request, data.get("code", ""), trust_browser=data.get("trust_browser", False)
    )
    refund_attempt(request, "mfa", identity)
    return JsonResponse({"nextStep": "authenticated", "recoveryCodes": codes})


@require_POST
@domain_view
def logout_view(request):
    clear_device = (
        request.content_type == "application/json"
        and bool(request.body)
        and json_object(request).get("clear_device") is True
    )
    if request.user.is_authenticated:
        ClinicalSession.objects.filter(session_key=request.session.session_key).update(revoked=True)
        audit(request.user, "auth.logout")
    logout(request)
    response = JsonResponse({"ok": True})
    if clear_device:
        # Explicit local recovery: keep clinic registration/approval intact.
        from django.utils import timezone

        from medframe_apps.stations.context import DEVICE_COOKIE, digest
        from medframe_apps.stations.kiosk_identity import PATIENT_COOKIE
        from medframe_apps.stations.models import KioskPatientSession

        secret = request.COOKIES.get(PATIENT_COOKIE)
        if secret:
            KioskPatientSession.objects.filter(digest=digest(secret), ended_at__isnull=True).update(
                ended_at=timezone.now()
            )
        response.delete_cookie(DEVICE_COOKIE, path="/", samesite="Strict")
        response.delete_cookie(PATIENT_COOKIE, path="/", samesite="Strict")
    return response


@require_POST
@domain_view
def recover_view(request):
    email = json_object(request).get("email", "")
    throttle(request, "recovery", str(email).strip().lower(), 3, 3600)
    services.request_password_reset(email)
    return JsonResponse({"message": "Reset link requested. Check your inbox."})


@require_POST
@domain_view
def reset_view(request):
    data = json_object(request)
    throttle(request, "reset", str(data.get("token", "")), 5, 900)
    services.reset_password(data.get("token", ""), data.get("password", ""))
    logout(request)
    return JsonResponse({"ok": True})
