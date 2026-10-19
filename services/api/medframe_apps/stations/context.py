"""Request-local identity, never an authorization substitute for native staff MFA."""

import hashlib
from contextvars import ContextVar

from config.errors import DomainError

current_request = ContextVar("station_request", default=None)
EDITOR_COOKIE = "medframe_editor"
DEVICE_COOKIE = "medframe_device"


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def client_digest(request):
    credential = getattr(request, "station_credential", None)
    if credential:
        return credential.digest
    value = request.COOKIES.get(EDITOR_COOKIE, "")
    if len(value) != 43:
        raise DomainError(
            "EDITOR_REQUIRED", "Open the consultation again to identify this browser.", 409
        )
    return digest(value)
