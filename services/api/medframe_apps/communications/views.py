from django.conf import settings
from django.core import signing
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from twilio.request_validator import RequestValidator

from config.errors import DomainError
from medframe_apps.communications.delivery import provider_status


@csrf_exempt
@require_POST
def sms_status(request):
    # Only the provider endpoint is exempt; signature + ticket replace browser CSRF here.
    if (
        not settings.SMS_LIVE_ENABLED
        or not settings.TWILIO_STATUS_CALLBACK_URL
        or not settings.TWILIO_AUTH_TOKEN
    ):
        return HttpResponse(status=404)
    ticket = request.GET.get("ticket", "")
    if len(ticket) > 512:
        return HttpResponse(status=403)
    url = settings.TWILIO_STATUS_CALLBACK_URL + "?" + request.META.get("QUERY_STRING", "")
    if not RequestValidator(settings.TWILIO_AUTH_TOKEN).validate(
        url, request.POST, request.headers.get("X-Twilio-Signature", "")
    ):
        return HttpResponse(status=403)
    try:
        identifier = signing.loads(ticket, salt="sms-delivery:v1", max_age=7 * 86400)
        provider_status(
            identifier, request.POST.get("MessageSid", ""), request.POST.get("MessageStatus", "")
        )
    except DomainError as failure:
        return HttpResponse(status=failure.status)
    except (signing.BadSignature, ValueError):
        return HttpResponse(status=403)
    return HttpResponse(status=204)
