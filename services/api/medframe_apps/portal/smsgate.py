"""Dedicated registration OTP transport; does not enable clinical reminder delivery."""

from ipaddress import ip_address
from urllib.parse import urlsplit

import requests
from requests.exceptions import ConnectTimeout, RequestException

from config.runtime import get_settings
from medframe_apps.communications.providers import SendResult


def configured():
    settings = get_settings()
    if not (
        settings.smsgate_otp_enabled
        and settings.smsgate_local_url
        and settings.smsgate_username
        and settings.smsgate_password.get_secret_value()
    ):
        return False
    url = urlsplit(settings.smsgate_local_url)
    try:
        address = ip_address(url.hostname or "")
    except ValueError:
        return False
    return bool(
        address.is_private
        and not address.is_unspecified
        and not address.is_multicast
        and url.scheme in {"http", "https"}
        and not url.username
        and not url.password
        and not url.query
        and not url.fragment
        and url.path in {"", "/", "/message"}
        and (url.scheme == "https" or settings.app_env == "development")
    )


def send_otp(recipient, code, identifier, ttl):
    if not configured():
        return SendResult("permanent_failure", code="SMSGATE_UNCONFIGURED")
    settings = get_settings()
    url = settings.smsgate_local_url.rstrip("/")
    if not url.endswith("/message"):
        url += "/message"
    try:
        response = requests.post(
            url,
            auth=(settings.smsgate_username, settings.smsgate_password.get_secret_value()),
            json={
                "id": str(identifier),
                "textMessage": {
                    "text": f"Your Medframe verification code is {code}. Expires 10 minutes after request. Do not share it."
                },
                "phoneNumbers": [recipient],
                "ttl": max(1, min(int(ttl), 600)),
            },
            timeout=(3, 8),
            allow_redirects=False,
        )
        if response.status_code == 429:
            return SendResult("retryable_failure", code="SMSGATE_RATE_LIMIT")
        if response.status_code >= 500:
            return SendResult("unknown", code="SMSGATE_ACCEPTANCE_UNKNOWN")
        if not 200 <= response.status_code < 300:
            return SendResult("permanent_failure", code="SMSGATE_REJECTED")
        payload = response.json()
        if not isinstance(payload, dict) or not isinstance(payload.get("id"), str):
            return SendResult("unknown", code="SMSGATE_RESPONSE_UNKNOWN")
        return SendResult("accepted", provider_id=payload["id"])
    except ConnectTimeout:
        return SendResult("retryable_failure", code="SMSGATE_CONNECT_TIMEOUT")
    except (RequestException, ValueError, OSError):
        return SendResult("unknown", code="SMSGATE_ACCEPTANCE_UNKNOWN")
