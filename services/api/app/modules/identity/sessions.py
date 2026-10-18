from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import utcnow
from app.core.errors import DomainError
from app.core.request_context import RequestContext
from app.core.security import csrf_for, digest, new_token
from app.modules.audit.service import append_event
from app.modules.identity.models import MfaCredential, Session, User
from app.modules.identity.passwords import dummy_hash, normalize_email, verify_password
from app.modules.identity.schemas import ChallengeResult, Principal, SessionResult


def invalid_session() -> DomainError:
    return DomainError("SESSION_EXPIRED", "Your session has expired. Sign in again.", 401)


async def load_session(
    db: AsyncSession, token: str, kind: str, now: datetime | None = None
) -> Session:
    now = now or utcnow()
    # All identity lifecycle operations lock the user before session/reset rows.
    # This serializes reset, MFA, logout, and expiry without lock-order cycles.
    user_id = await db.scalar(select(Session.user_id).where(Session.token_hash == digest(token)))
    if user_id is None:
        raise invalid_session()
    user = await db.scalar(
        select(User).where(User.id == user_id, User.active.is_(True)).with_for_update()
    )
    if user is None:
        raise invalid_session()
    session = await db.scalar(
        select(Session).where(Session.token_hash == digest(token)).with_for_update()
    )
    if (
        session is None
        or session.revoked
        or session.kind != kind
        or session.expires_at <= now
        or (kind == "clinical" and session.last_seen_at + timedelta(minutes=30) <= now)
    ):
        raise invalid_session()
    session.last_seen_at = now
    return session


async def issue_session(db: AsyncSession, user: User, kind: str) -> SessionResult:
    token = new_token()
    expires_at = utcnow() + (timedelta(hours=8) if kind == "clinical" else timedelta(minutes=5))
    db.add(
        Session(
            user_id=user.id,
            token_hash=digest(token),
            kind=kind,
            expires_at=expires_at,
            last_seen_at=utcnow(),
        )
    )
    await db.flush()
    return SessionResult(token, csrf_for(token), expires_at)


async def begin_login(
    db: AsyncSession, email: str, password: str, context: RequestContext
) -> ChallengeResult:
    user = await db.scalar(
        select(User).where(User.email == normalize_email(email)).with_for_update()
    )
    verified = verify_password(password, user.password_hash if user else dummy_hash)
    if not user or not user.active or not verified:
        raise DomainError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401)
    credential = await db.get(MfaCredential, user.id)
    result = await issue_session(db, user, "challenge")
    await append_event(db, None, context, "auth.password_verified", resource_id=user.id)
    next_step = "verify" if credential and credential.confirmed else "enroll"
    return ChallengeResult(result.token, result.csrf_token, result.expires_at, next_step)


async def authenticate_session(
    db: AsyncSession, token: str, now: datetime | None = None
) -> Principal:
    session = await load_session(db, token, "clinical", now)
    return Principal(session.user_id, session.id)


async def revoke_session(db: AsyncSession, principal: Principal, context: RequestContext) -> None:
    session = await db.get(Session, principal.session_id)
    session.revoked = True
    await append_event(db, principal, context, "auth.logout")
