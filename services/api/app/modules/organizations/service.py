from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.schemas import Principal
from app.modules.organizations.models import Branch, Membership, Organization
from app.modules.organizations.permissions import require_permission


async def list_my_organizations(db: AsyncSession, principal: Principal) -> list[Organization]:
    rows = await db.scalars(
        select(Organization)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(
            Membership.user_id == principal.user_id,
            Membership.active.is_(True),
            Organization.active.is_(True),
        )
        .order_by(Organization.name)
    )
    return list(rows)


async def get_workspace(db: AsyncSession, principal: Principal, organization_id: UUID):
    membership = await require_permission(db, principal, organization_id, "workspace.read")
    organization = await db.get(Organization, organization_id)
    query = select(Branch).where(Branch.organization_id == organization_id).order_by(Branch.name)
    if membership.branch_id:
        query = query.where(Branch.id == membership.branch_id)
    return organization, list(await db.scalars(query))
