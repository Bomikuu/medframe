"""Public-safe connection readiness; never disclose media credentials or host addresses."""

from urllib.parse import urlsplit
from config.runtime import get_settings
from medframe_apps.operations.call_policy import media_config
from config.errors import DomainError


def connection_summary():
    settings = get_settings()
    origin = urlsplit(settings.web_origin)
    try:
        public = media_config().get("public_media") is True
    except DomainError:
        public = False
    return {
        "profile": "internet" if public else "loopback",
        "secure_origin": origin.scheme == "https" and settings.cookie_secure,
    }
