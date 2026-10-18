from uuid import UUID

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, Record


class AuditEvent(Record, Base):
    __tablename__ = "audit_events"

    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    organization_id: Mapped[UUID | None] = mapped_column(ForeignKey("organizations.id"))
    action: Mapped[str] = mapped_column(String(100))
    resource_id: Mapped[UUID | None]
    outcome: Mapped[str] = mapped_column(String(32))
    request_id: Mapped[str] = mapped_column(String(64))
