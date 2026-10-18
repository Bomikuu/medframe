import hashlib
import hmac
import secrets

from cryptography.fernet import Fernet

from app.core.config import get_settings


def new_token() -> str:
    return secrets.token_urlsafe(32)


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def csrf_for(token: str) -> str:
    return hmac.new(
        get_settings().app_secret.get_secret_value().encode(), token.encode(), "sha256"
    ).hexdigest()


def cipher() -> Fernet:
    return Fernet(get_settings().encryption_key.get_secret_value().encode())
