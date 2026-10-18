from email_validator import EmailNotValidError, validate_email
from pwdlib import PasswordHash

from app.core.errors import DomainError

hasher = PasswordHash.recommended()
dummy_hash = hasher.hash("not-a-real-user-password")


def normalize_email(email: str) -> str:
    try:
        return validate_email(email.strip(), check_deliverability=False).normalized.casefold()
    except EmailNotValidError:
        raise DomainError("INVALID_INPUT", "Enter a valid email address.") from None


def validate_password(password: str) -> None:
    if not 15 <= len(password) <= 128:
        raise DomainError("INVALID_INPUT", "Use a password between 15 and 128 characters.")


def hash_password(password: str) -> str:
    validate_password(password)
    return hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    if len(password) > 128:
        return False
    return hasher.verify(password, password_hash)
