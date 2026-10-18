from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, Record


class User(Record, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True)
    display_name: Mapped[str] = mapped_column(String(160))
    password_hash: Mapped[str] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Session(Record, Base):
    __tablename__ = "sessions"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    kind: Mapped[str] = mapped_column(String(16))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class MfaCredential(Base):
    __tablename__ = "mfa_credentials"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    encrypted_secret: Mapped[str] = mapped_column(Text)
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    last_step: Mapped[int] = mapped_column(default=-1)


class RecoveryCode(Record, Base):
    __tablename__ = "recovery_codes"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    code_hash: Mapped[str] = mapped_column(String(64), unique=True)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)


class PasswordReset(Record, Base):
    __tablename__ = "password_resets"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)


class MailOutbox(Record, Base):
    __tablename__ = "mail_outbox"

    encrypted_payload: Mapped[str] = mapped_column(Text)
    attempts: Mapped[int] = mapped_column(default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
