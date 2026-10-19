"""Provider boundary. Never log the SDK exception, recipient or message body."""

from dataclasses import dataclass

from django.conf import settings
from requests.exceptions import ConnectTimeout, RequestException
from twilio.base.exceptions import TwilioRestException
from twilio.http.http_client import TwilioHttpClient
from twilio.rest import Client


@dataclass(frozen=True)
class SendResult:
    state: str
    provider_id: str = ""
    code: str = ""


def send_sms(recipient, body, callback_url):
    if not settings.SMS_LIVE_ENABLED:
        return SendResult("permanent_failure", code="LIVE_DISABLED")
    if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_FROM]):
        return SendResult("permanent_failure", code="PROVIDER_UNCONFIGURED")
    try:
        client = Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN,
            http_client=TwilioHttpClient(timeout=10, max_retries=0),
        )
        message = client.messages.create(
            to=recipient,
            from_=settings.TWILIO_FROM,
            body=body,
            **({"status_callback": callback_url} if callback_url else {}),
        )
        return SendResult("accepted", provider_id=message.sid)
    except ConnectTimeout:
        return SendResult("retryable_failure", code="CONNECT_TIMEOUT")
    except TwilioRestException as failure:
        if failure.status == 429:
            return SendResult("retryable_failure", code="PROVIDER_RATE_LIMIT")
        return SendResult(
            "unknown" if failure.status >= 500 else "permanent_failure",
            code="PROVIDER_UNCERTAIN" if failure.status >= 500 else "PROVIDER_REJECTED",
        )
    except (RequestException, TimeoutError, OSError):
        return SendResult("unknown", code="ACCEPTANCE_UNKNOWN")
