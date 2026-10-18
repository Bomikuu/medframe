"""Compatible digests and encryption for preserved identity material."""

import hashlib

from cryptography.fernet import Fernet

from config.runtime import get_settings


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def cipher() -> Fernet:
    return Fernet(get_settings().encryption_key.get_secret_value().encode())
