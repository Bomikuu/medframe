from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, Record, utcnow


class Patient(Record, Base):
    __tablename__ = "patients"
    __table_args__ = (
        UniqueConstraint("id", "organization_id"),
        UniqueConstraint("organization_id", "reference"),
        ForeignKeyConstraint(
            ["branch_id", "organization_id"], ["branches.id", "branches.organization_id"]
        ),
        CheckConstraint("version > 0"),
        CheckConstraint("sex IN ('female', 'male', 'intersex', 'not_recorded')"),
        Index(
            "ix_patients_reference_trgm",
            "reference",
            postgresql_using="gin",
            postgresql_ops={"reference": "gin_trgm_ops"},
        ),
        Index(
            "ix_patients_name_trgm",
            "full_name",
            postgresql_using="gin",
            postgresql_ops={"full_name": "gin_trgm_ops"},
        ),
    )
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    branch_id: Mapped[UUID]
    reference: Mapped[str] = mapped_column(String(32))
    full_name: Mapped[str] = mapped_column(String(160))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    sex: Mapped[str] = mapped_column(String(20), default="not_recorded")
    email: Mapped[str | None] = mapped_column(String(254))
    phone: Mapped[str | None] = mapped_column(String(40))
    address: Mapped[str | None] = mapped_column(String(500))
    emergency_contact_name: Mapped[str | None] = mapped_column(String(160))
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(40))
    emergency_contact_relationship: Mapped[str | None] = mapped_column(String(160))
    guardian_name: Mapped[str | None] = mapped_column(String(160))
    guardian_phone: Mapped[str | None] = mapped_column(String(40))
    guardian_relationship: Mapped[str | None] = mapped_column(String(160))
    registered_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PatientAccessGrant(Record, Base):
    __tablename__ = "patient_access_grants"
    __table_args__ = (
        UniqueConstraint("patient_id", "membership_id"),
        ForeignKeyConstraint(
            ["patient_id", "organization_id"], ["patients.id", "patients.organization_id"]
        ),
        ForeignKeyConstraint(
            ["membership_id", "organization_id"], ["memberships.id", "memberships.organization_id"]
        ),
    )
    organization_id: Mapped[UUID]
    patient_id: Mapped[UUID] = mapped_column(index=True)
    membership_id: Mapped[UUID] = mapped_column(index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    granted_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    revoked_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))


class PatientClinicalRevision(Record, Base):
    __tablename__ = "patient_clinical_revisions"
    __table_args__ = (
        UniqueConstraint("patient_id", "version"),
        UniqueConstraint("id", "patient_id", "organization_id"),
        CheckConstraint(
            "allergy_state IN ('unreviewed', 'none_reported', 'recorded')",
            name="ck_patient_allergy_state",
        ),
        CheckConstraint(
            "medication_state IN ('unreviewed', 'none_reported', 'recorded')",
            name="ck_patient_medication_state",
        ),
        CheckConstraint(
            "(allergy_state = 'recorded') = (jsonb_array_length(allergies) > 0)",
            name="ck_patient_allergy_items",
        ),
        CheckConstraint(
            "(medication_state = 'recorded') = (jsonb_array_length(medications) > 0)",
            name="ck_patient_medication_items",
        ),
        ForeignKeyConstraint(
            ["patient_id", "organization_id"], ["patients.id", "patients.organization_id"]
        ),
        CheckConstraint("version > 0"),
    )
    organization_id: Mapped[UUID]
    patient_id: Mapped[UUID] = mapped_column(index=True)
    version: Mapped[int]
    author_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    medical_history: Mapped[str] = mapped_column(Text, default="")
    conditions: Mapped[str] = mapped_column(Text, default="")
    past_procedures: Mapped[str] = mapped_column(Text, default="")
    allergy_state: Mapped[str] = mapped_column(String(20), default="unreviewed")
    allergies: Mapped[list] = mapped_column(JSONB, default=list)
    medication_state: Mapped[str] = mapped_column(String(20), default="unreviewed")
    medications: Mapped[list] = mapped_column(JSONB, default=list)
    reason: Mapped[str] = mapped_column(String(240), default="")


class PatientEvent(Record, Base):
    __tablename__ = "patient_events"
    __table_args__ = (
        ForeignKeyConstraint(
            ["patient_id", "organization_id"], ["patients.id", "patients.organization_id"]
        ),
        ForeignKeyConstraint(
            ["revision_id", "patient_id", "organization_id"],
            [
                "patient_clinical_revisions.id",
                "patient_clinical_revisions.patient_id",
                "patient_clinical_revisions.organization_id",
            ],
        ),
        Index("ix_patient_events_patient_time", "patient_id", "created_at", "id"),
        ForeignKeyConstraint(
            ["target_membership_id", "organization_id"],
            ["memberships.id", "memberships.organization_id"],
            name="fk_patient_event_target_membership",
        ),
    )
    organization_id: Mapped[UUID]
    patient_id: Mapped[UUID]
    action: Mapped[str] = mapped_column(String(60))
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    revision_id: Mapped[UUID | None]
    target_membership_id: Mapped[UUID | None]


class PatientRegistrationRequest(Record, Base):
    __tablename__ = "patient_registration_requests"
    __table_args__ = (
        UniqueConstraint("organization_id", "actor_id", "request_id"),
        ForeignKeyConstraint(
            ["patient_id", "organization_id"], ["patients.id", "patients.organization_id"]
        ),
    )
    organization_id: Mapped[UUID]
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    request_id: Mapped[UUID]
    patient_id: Mapped[UUID]
    input_digest: Mapped[str] = mapped_column(String(64))
