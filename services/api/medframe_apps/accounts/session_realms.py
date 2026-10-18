"""Realm checks supplement native Django authentication and live domain policy."""

from typing import Literal, Protocol

from config.errors import DomainError

SessionRealm = Literal["staff", "patient"]


class SessionActivation(Protocol):
    def prepare(self, user, request): ...

    def complete(self, user, request): ...


def require_session_realm(request, realm: SessionRealm):
    if not request.user.is_authenticated or not request.session.get("mfa_verified"):
        raise DomainError("UNAUTHENTICATED", "Sign in to continue.", 401)
    if request.session.get("auth_realm", "staff") != realm:
        raise DomainError("FORBIDDEN", "Sign in to the appropriate workspace to continue.", 403)
    return request.user
