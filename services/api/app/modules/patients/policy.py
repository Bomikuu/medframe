from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import Select, exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.modules.identity.models import User
from app.modules.organizations.models import Membership, MembershipRole, RolePermission
from app.modules.organizations.permissions import require_permission
from app.modules.patients.models import Patient, PatientAccessGrant


async def effective_permissions(db: AsyncSession, membership_id: UUID) -> set[str]:
    return set(
        await db.scalars(
            select(RolePermission.permission)
            .join(MembershipRole, MembershipRole.role == RolePermission.role)
            .where(MembershipRole.membership_id == membership_id)
        )
    )


@dataclass(frozen=True)
class PatientScope:
    organization_id: UUID
    membership_id: UUID
    branch_id: UUID | None
    directory_access: bool


async def resolve_patient_scope(db, principal, organization_id, permission) -> PatientScope:
    membership = await require_permission(db, principal, organization_id, permission)
    if not await db.scalar(select(User.active).where(User.id == principal.user_id)):
        raise DomainError("FORBIDDEN", "Patient access is unavailable.", 403)
    permissions = await effective_permissions(db, membership.id)
    clinical = permission.startswith("patients.clinical.")
    directory_access = not clinical and bool(
        {"patients.directory.manage", "patients.access.manage"} & permissions
    )
    return PatientScope(organization_id, membership.id, membership.branch_id, directory_access)


def eligible_memberships(organization_id: UUID, branch_id: UUID) -> Select:
    return (
        select(Membership)
        .join(User, User.id == Membership.user_id)
        .where(
            Membership.organization_id == organization_id,
            Membership.active.is_(True),
            User.active.is_(True),
            (Membership.branch_id.is_(None) | (Membership.branch_id == branch_id)),
            exists(
                select(MembershipRole.membership_id)
                .join(RolePermission, RolePermission.role == MembershipRole.role)
                .where(
                    MembershipRole.membership_id == Membership.id,
                    RolePermission.permission == "patients.clinical.read",
                )
            ),
        )
    )


def scoped_patients(scope: PatientScope) -> Select:
    query = select(Patient).where(Patient.organization_id == scope.organization_id)
    if scope.branch_id:
        query = query.where(Patient.branch_id == scope.branch_id)
    if not scope.directory_access:
        query = query.where(
            exists(
                select(MembershipRole.membership_id)
                .join(RolePermission, RolePermission.role == MembershipRole.role)
                .where(
                    MembershipRole.membership_id == scope.membership_id,
                    RolePermission.permission == "patients.clinical.read",
                )
            ),
            exists(
                select(PatientAccessGrant.id).where(
                    PatientAccessGrant.patient_id == Patient.id,
                    PatientAccessGrant.organization_id == scope.organization_id,
                    PatientAccessGrant.membership_id == scope.membership_id,
                    PatientAccessGrant.active.is_(True),
                )
            ),
        )
    return query


async def require_patient(db, principal, organization_id, patient_id, permission, *, lock=False):
    scope = await resolve_patient_scope(db, principal, organization_id, permission)
    query = scoped_patients(scope).where(Patient.id == patient_id)
    if lock:
        query = query.with_for_update(of=Patient)
    patient = await db.scalar(query)
    # Recheck after acquiring the lock; revocation may have committed while waiting.
    if patient is not None and lock and not scope.directory_access:
        patient = await db.scalar(
            scoped_patients(scope)
            .where(Patient.id == patient_id)
            .execution_options(populate_existing=True)
        )
    if patient is None:
        raise DomainError("NOT_FOUND", "Patient is unavailable or you do not have access.", 404)
    return patient
