from django.core.files.storage import default_storage
from django.db import transaction
from django.http import FileResponse, JsonResponse
from django.views.decorators.http import require_GET, require_POST

from config.errors import DomainError
from config.middleware import domain_view, json_object
from medframe_apps.accounts import services
from medframe_apps.accounts.throttling import throttle

from .accounts import OnboardingActivation, begin_account
from .logos import upload_logo
from .models import OnboardingLogo, OnboardingVerification
from .verification import bind_proof, require_onboarding


@require_POST
@domain_view
def prepare_account(request):
    throttle(request, "onboarding-account", request.session.session_key or "missing", 5, 900)
    return JsonResponse(begin_account(request, json_object(request)))


@require_POST
@domain_view
def enroll(request):
    require_onboarding(request, for_account=True)
    return JsonResponse({"otpauthUri": services.enroll(request)})


@require_POST
@domain_view
@transaction.atomic
def verify_mfa(request):
    require_onboarding(request, for_account=True)
    throttle(request, "onboarding-mfa", request.session.session_key or "missing", 5, 300)
    proof = OnboardingVerification.objects.get(id=request.session["onboarding_proof"])
    codes = services.verify_mfa(
        request, json_object(request).get("code", ""), activation=OnboardingActivation()
    )
    bind_proof(request, proof)
    from .drafts import snapshot

    return JsonResponse({"recoveryCodes": codes, "snapshot": snapshot(request)})


@require_POST
@domain_view
def upload(request):
    if len(request.FILES) != 1:
        raise DomainError("INVALID_FILE", "Choose one logo.")
    return JsonResponse(
        upload_logo(request, request.FILES.get("file"), int(request.POST.get("version", "0")))
    )


@require_GET
@domain_view
def logo_content(request, identifier):
    draft = require_onboarding(request, allow_completed=True)
    logo = OnboardingLogo.objects.filter(
        id=identifier, draft=draft, selected=True, scan_state="clean"
    ).first()
    if not logo:
        raise DomainError("NOT_FOUND", "This logo is unavailable.", 404)
    response = FileResponse(default_storage.open(logo.key, "rb"), content_type=logo.content_type)
    response["Content-Security-Policy"] = "default-src 'none'; sandbox"
    return response
