import hmac
import re
import secrets
import time

import pyotp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.request_context import RequestContext
from app.core.security import cipher, digest
from app.modules.audit.service import append_event
from app.modules.identity.models import MfaCredential, RecoveryCode, User
from app.modules.identity.schemas import MfaCompletionResult
from app.modules.identity.sessions import issue_session, load_session


async def begin_mfa_enrollment(db: AsyncSession, challenge_token: str) -> str:
    challenge = await load_session(db, challenge_token, "challenge")
    # Lock the user as well: separate password challenges must not enroll concurrently.
    user = await db.scalar(select(User).where(User.id == challenge.user_id).with_for_update())
    credential = await db.get(MfaCredential, user.id)
    if credential and credential.confirmed:
        raise DomainError("MFA_ALREADY_ENROLLED", "Use your existing authenticator to continue.")
    if credential is None:
        credential = MfaCredential(
            user_id=user.id,
            encrypted_secret=cipher().encrypt(pyotp.random_base32().encode()).decode(),
        )
        db.add(credential)
        await db.flush()
    secret = cipher().decrypt(credential.encrypted_secret.encode()).decode()
    return pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="Medframe")


async def complete_mfa(
    db: AsyncSession, challenge_token: str, code: str, context: RequestContext
) -> MfaCompletionResult:
    challenge = await load_session(db, challenge_token, "challenge")
    user = await db.scalar(select(User).where(User.id == challenge.user_id).with_for_update())
    credential = await db.scalar(
        select(MfaCredential).where(MfaCredential.user_id == user.id).with_for_update()
    )
    if not credential:
        raise DomainError("MFA_REQUIRED", "Set up your authenticator before continuing.")
    secret = cipher().decrypt(credential.encrypted_secret.encode()).decode()
    current_step = int(time.time()) // 30
    matched_step = None
    if re.fullmatch(r"[0-9]{6}", code):
        for step in (current_step - 1, current_step, current_step + 1):
            if step > credential.last_step and hmac.compare_digest(
                pyotp.TOTP(secret).at(step * 30), code
            ):
                matched_step = step
                break
    recovery = None
    if matched_step is None and credential.confirmed:
        recovery = await db.scalar(
            select(RecoveryCode)
            .where(
                RecoveryCode.user_id == user.id,
                RecoveryCode.code_hash == digest(code),
                RecoveryCode.consumed.is_(False),
            )
            .with_for_update()
        )
    if matched_step is None and recovery is None:
        raise DomainError(
            "INVALID_MFA", "That code is invalid or already used. Try a new code.", 401
        )
    codes = None
    if matched_step is not None:
        credential.last_step = matched_step
    if recovery:
        recovery.consumed = True
    if not credential.confirmed:
        credential.confirmed = True
        codes = [secrets.token_hex(8) for _ in range(10)]
        for value in codes:
            db.add(RecoveryCode(user_id=user.id, code_hash=digest(value)))
    challenge.revoked = True
    result = await issue_session(db, user, "clinical")
    await append_event(db, None, context, "auth.mfa_verified", resource_id=user.id)
    return MfaCompletionResult(result, codes)
