from django.http import JsonResponse
from django.views.decorators.http import require_POST

from config.middleware import domain_view, json_object
from medframe_apps.accounts import google_signin
from medframe_apps.accounts.throttling import refund_attempt, throttle


@require_POST
@domain_view
def prepare(request, realm="staff"):
    return JsonResponse(google_signin.prepare(request, realm))


@require_POST
@domain_view
def login(request, realm="staff"):
    data = json_object(request)
    identity = request.session.session_key or "missing"
    throttle(request, f"google-{realm}", identity, 5, 900)
    step = google_signin.begin(
        request,
        data.get("credential", ""),
        data.get("remember", False),
        realm,
        shared_device=data.get("shared_device", False),
    )
    refund_attempt(request, f"google-{realm}", identity)
    from medframe_apps.accounts.sign_in_policy import shared_browser

    return JsonResponse(
        {
            "nextStep": step,
            "canRememberBrowser": bool(
                request.session.get("challenge_trust_eligible") and not shared_browser(request)
            ),
        }
    )
