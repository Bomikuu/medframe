from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from config.errors import DomainError
from config.middleware import domain_view, json_object
from medframe_apps.accounts import services as accounts
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.accounts.throttling import throttle
from . import staff_onboarding as onboarding
from . import staff_photos, staff_service as staff


@require_POST
@domain_view
def manage(request):
    data = json_object(request)
    actor = staff.administrator(request, data.get("organization_id"))
    throttle(request, "staff.manage", str(request.user.id), 90, 60)
    action = data.get("action", "list")
    if action == "list":
        return JsonResponse(staff.snapshot(actor))
    if action == "update":
        return JsonResponse(staff.update_member(request, actor, data))
    if action == "invite":
        return JsonResponse(staff.create_invitation(request, actor, data))
    if action == "link":
        row = staff.StaffInvitation.objects.filter(
            id=data.get("invitation_id"), organization=actor.organization
        ).first()
        if (
            not row
            or (actor.branch_id and row.branch_id != actor.branch_id)
            or staff.invite_state(row) != "pending"
            or not row.encrypted_token
        ):
            raise DomainError("NOT_FOUND", "This invitation link is unavailable.", 404)
        token = staff.cipher().decrypt(row.encrypted_token.encode()).decode()
        return JsonResponse({"link": f"{staff.get_settings().web_origin}/staff/onboarding/{token}"})
    if action in {"regenerate", "revoke"}:
        return JsonResponse(staff.change_invitation(request, actor, data))
    raise DomainError("INVALID_INPUT", "Choose a supported staff action.")


@require_POST
@domain_view
def public(request):
    data = json_object(request)
    token, action = data.get("token"), data.get("action", "open")
    throttle(request, "staff.onboarding", str(token)[:64], 60, 60)
    if action == "open":
        row = onboarding.invitation(request, token)
        return JsonResponse(onboarding.snapshot(request, row))
    if action == "request_code":
        throttle(request, "staff.code", str(token)[:64], 3, 300)
        return JsonResponse(onboarding.request_code(request, token, data.get("email")))
    if action == "verify_code":
        throttle(request, "staff.verify", str(token)[:64], 5, 300)
        return JsonResponse(onboarding.verify_email(request, token, data.get("code")))
    if action == "profile":
        return JsonResponse(onboarding.save_profile(request, token, data))
    if action == "remove_photo":
        with transaction.atomic():
            row = onboarding.invitation(request, token, proof=True, lock=True)
            row.photo = None
            row.save(update_fields=["photo"])
            return JsonResponse(onboarding.snapshot(request, row))
    if action == "google_prepare":
        from medframe_apps.accounts.google_signin import prepare

        row = onboarding.invitation(request, token, proof=True)
        return JsonResponse(prepare(request, f"staff:{row.id}"))
    if action == "google_account":
        throttle(request, "staff.google", request.session.session_key or "missing", 5, 900)
        return JsonResponse(onboarding.begin_google(request, token, data.get("credential")))
    if action == "prepare_account":
        throttle(request, "staff.account", str(token)[:64], 5, 900)
        return JsonResponse(onboarding.begin_account(request, token, data))
    if action == "enroll":
        onboarding.invitation(request, token, proof=True)
        if request.session.get("staff_token_hash") != staff.digest(token):
            raise DomainError("VERIFICATION_REQUIRED", "Restart account verification.", 403)
        return JsonResponse({"otpauthUri": accounts.enroll(request)})
    if action == "verify_mfa":
        throttle(request, "staff.mfa", request.session.session_key or "missing", 5, 300)
        onboarding.invitation(request, token, proof=True)
        activation = onboarding.StaffActivation()
        codes = accounts.verify_mfa(request, data.get("code", ""), activation=activation)
        return JsonResponse({"recoveryCodes": codes, **activation.result})
    if action == "accept":
        require_session_realm(request, "staff")
        if not request.session.get("mfa_verified"):
            raise DomainError(
                "MFA_REQUIRED",
                "Complete authenticator verification to activate a new clinic membership.",
                403,
            )
        if getattr(request, "station_access", None) or getattr(request, "station_doctor", None):
            raise DomainError("FORBIDDEN", "Accept from your own authenticated workstation.", 403)
        with transaction.atomic():
            row = onboarding.invitation(request, token, proof=True, lock=True)
            return JsonResponse(onboarding.activate(request, row, request.user))
    raise DomainError("INVALID_INPUT", "Choose a supported onboarding step.")


@require_POST
@domain_view
def photo_upload(request):
    throttle(request, "staff.photo", request.session.session_key or "missing", 10, 300)
    return JsonResponse(staff_photos.upload(request))


@require_GET
@domain_view
def photo_content(request, identifier):
    return staff_photos.content(request, identifier)
