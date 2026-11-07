from django.http import JsonResponse
from django.views.decorators.http import require_POST

from config.errors import DomainError
from config.middleware import domain_view, json_object
from medframe_apps.accounts.throttling import throttle
from medframe_apps.portal import registration_contact as contact
from medframe_apps.portal import registration_service as intake
from medframe_apps.portal import registration_google as google


@require_POST
@domain_view
def public(request):
    data = json_object(request)
    token = data.get("token", "")
    if not isinstance(token, str) or not 30 <= len(token) <= 80:
        raise DomainError("NOT_FOUND", "Open the registration link shared by your clinic.", 404)
    entry = contact.live_entry(token)
    action = data.get("action", "bootstrap")
    if action == "bootstrap":
        return JsonResponse(contact.bootstrap(request, entry))
    if action == "send_code":
        return JsonResponse(
            contact.send_code(
                request,
                entry,
                data.get("phone", "") if data.get("channel") == "mobile" else data.get("email", ""),
                data.get("channel", "email"),
            )
        )
    if action == "google_prepare":
        return JsonResponse(google.prepare(request, f"registration:{entry.id}"))
    if action == "google_verify":
        throttle(request, "patient-register-google", contact.session_hash(request), 5, 900)
        return JsonResponse(google.verify_contact(request, entry, data.get("credential", "")))
    if action == "code_status":
        proof = contact.RegistrationContact.objects.filter(
            id=request.session.get("patient_registration_challenge"),
            entry=entry,
            session_hash=contact.session_hash(request),
            channel="mobile",
            invalidated=False,
        ).first()
        return JsonResponse({"state": proof.delivery_state if proof else "unavailable"})
    if action == "verify_code":
        throttle(request, "patient-register-verify", contact.session_hash(request), 10, 600)
        return JsonResponse(contact.verify_code(request, entry, data.get("code", "")))
    if action == "submit":
        throttle(request, "patient-register-submit", contact.session_hash(request), 10, 3600)
        return JsonResponse({"application": intake.submit(request, entry, data.get("details", {}))})
    raise DomainError("INVALID_INPUT", "Choose an available registration step.")


@require_POST
@domain_view
def manage(request):
    return JsonResponse(intake.manage(request, json_object(request)))


@require_POST
@domain_view
def google_invitation(request):
    data = json_object(request)
    invitation = google.invitation_for(data.get("token", ""))
    if data.get("action") == "prepare":
        return JsonResponse(google.prepare(request, f"patient-invitation:{invitation.id}"))
    throttle(request, "patient-invite-google", contact.session_hash(request), 5, 900)
    return JsonResponse(
        {
            "nextStep": google.activate_invitation(
                request, data.get("token", ""), data.get("credential", "")
            )
        }
    )
