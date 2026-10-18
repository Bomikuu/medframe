import hmac

from fastapi import Request

from app.core.config import get_settings
from app.core.errors import DomainError
from app.core.security import csrf_for

SESSION_COOKIE = "medframe_session"
CHALLENGE_COOKIE = "medframe_challenge"
BOOTSTRAP_COOKIE = "medframe_bootstrap"


def validate_unsafe_request(request: Request, csrf_secret: str | None = None) -> None:
    if request.headers.get("origin") != get_settings().web_origin:
        raise DomainError(
            "INVALID_ORIGIN", "This request could not be verified. Reload and retry.", 403
        )
    token = csrf_secret or (
        request.cookies.get(SESSION_COOKIE)
        or request.cookies.get(CHALLENGE_COOKIE)
        or request.cookies.get(BOOTSTRAP_COOKIE)
    )
    provided = request.headers.get("x-csrf-token", "")
    if not token or not hmac.compare_digest(provided, csrf_for(token)):
        raise DomainError("INVALID_CSRF", "Your security token has expired. Reload and retry.", 403)
