from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, ForeignKeyConstraint, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, Record


class Organization(Record, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(160), unique=True)
    clinic_type: Mapped[str] = mapped_column(String(40), default="dental")
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Manila")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Branch(Record, Base):
    __tablename__ = "branches"
    __table_args__ = (UniqueConstraint("id", "organization_id"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))


class Membership(Record, Base):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "organization_id"),
        UniqueConstraint("id", "organization_id", name="uq_memberships_id_organization"),
        ForeignKeyConstraint(
            ["branch_id", "organization_id"], ["branches.id", "branches.organization_id"]
        ),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    branch_id: Mapped[UUID | None]
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Role(Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(64), primary_key=True)


class Permission(Base):
    __tablename__ = "permissions"

    name: Mapped[str] = mapped_column(String(100), primary_key=True)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role: Mapped[str] = mapped_column(ForeignKey("roles.name"), primary_key=True)
    permission: Mapped[str] = mapped_column(ForeignKey("permissions.name"), primary_key=True)


class MembershipRole(Base):
    __tablename__ = "membership_roles"

    membership_id: Mapped[UUID] = mapped_column(ForeignKey("memberships.id"), primary_key=True)
    role: Mapped[str] = mapped_column(ForeignKey("roles.name"), primary_key=True)
