from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class Principal:
    user_id: UUID
    session_id: UUID
    mfa_verified: bool = True


@dataclass(frozen=True)
class SessionResult:
    token: str
    csrf_token: str
    expires_at: datetime


@dataclass(frozen=True)
class ChallengeResult(SessionResult):
    next_step: str


@dataclass(frozen=True)
class MfaCompletionResult:
    session: SessionResult
    recovery_codes: list[str] | None
