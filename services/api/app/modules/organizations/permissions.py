from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import forbidden
from app.modules.identity.schemas import Principal
from app.modules.organizations.models import (
    Membership,
    MembershipRole,
    Organization,
    RolePermission,
)
from app.modules.patients.policy_defaults import PATIENT_ROLE_PERMISSIONS

ROLE_PERMISSIONS = {
    "platform_administrator": {"workspace.read"},
    "clinic_administrator": {"workspace.read", "organization.manage"},
    "doctor": {"workspace.read"},
    "dentist": {"workspace.read"},
    "nurse": {"workspace.read"},
    "receptionist": {"workspace.read"},
    "patient": set(),
}


for permission, roles in PATIENT_ROLE_PERMISSIONS.items():
    for role in roles:
        ROLE_PERMISSIONS[role].add(permission)


async def require_permission(
    db: AsyncSession, principal: Principal, organization_id: UUID, permission: str
) -> Membership:
    membership = await db.scalar(
        select(Membership)
        .join(Organization, Organization.id == Membership.organization_id)
        .join(MembershipRole, MembershipRole.membership_id == Membership.id)
        .join(RolePermission, RolePermission.role == MembershipRole.role)
        .where(
            Membership.user_id == principal.user_id,
            Membership.organization_id == organization_id,
            Membership.active.is_(True),
            Organization.active.is_(True),
            RolePermission.permission == permission,
        )
    )
    if membership is None or not principal.mfa_verified:
        raise forbidden()
    return membership
