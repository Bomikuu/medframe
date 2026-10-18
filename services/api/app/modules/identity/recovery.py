import json
from datetime import timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import utcnow
from app.core.errors import DomainError
from app.core.request_context import RequestContext
from app.core.security import cipher, digest, new_token
from app.modules.audit.service import append_event
from app.modules.identity.models import MailOutbox, PasswordReset, Session, User
from app.modules.identity.passwords import hash_password, normalize_email


async def request_password_reset(db: AsyncSession, email: str, context: RequestContext) -> None:
    if not get_settings().recovery_enabled:
        return
    user = await db.scalar(select(User).where(User.email == normalize_email(email), User.active))
    if user is None:
        return
    token = new_token()
    db.add(
        PasswordReset(
            user_id=user.id, token_hash=digest(token), expires_at=utcnow() + timedelta(minutes=15)
        )
    )
    # A fragment keeps the token out of HTTP request URLs and server access logs.
    payload = json.dumps(
        {"email": user.email, "url": f"{get_settings().web_origin}/auth/reset#token={token}"}
    )
    db.add(
        MailOutbox(
            encrypted_payload=cipher().encrypt(payload.encode()).decode(), available_at=utcnow()
        )
    )
    await append_event(db, None, context, "auth.recovery_requested", resource_id=user.id)


async def reset_password(
    db: AsyncSession, token: str, password: str, context: RequestContext
) -> None:
    user_id = await db.scalar(
        select(PasswordReset.user_id).where(PasswordReset.token_hash == digest(token))
    )
    if user_id is None:
        raise DomainError(
            "INVALID_RESET", "This reset link has expired or was used. Request a new one."
        )
    user = await db.scalar(select(User).where(User.id == user_id).with_for_update())
    record = await db.scalar(
        select(PasswordReset).where(PasswordReset.token_hash == digest(token)).with_for_update()
    )
    if record is None or record.consumed or record.expires_at <= utcnow():
        raise DomainError(
            "INVALID_RESET", "This reset link has expired or was used. Request a new one."
        )
    if not user.active:
        raise DomainError(
            "INVALID_RESET", "This reset link has expired or was used. Request a new one."
        )
    user.password_hash = hash_password(password)
    await db.execute(update(Session).where(Session.user_id == user.id).values(revoked=True))
    await db.execute(
        update(PasswordReset).where(PasswordReset.user_id == user.id).values(consumed=True)
    )
    await append_event(db, None, context, "auth.password_reset", resource_id=user.id)
