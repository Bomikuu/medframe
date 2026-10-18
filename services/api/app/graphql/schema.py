from uuid import UUID

import strawberry
from strawberry.types import Info

from app.core.database import session_factory
from app.modules.audit.service import append_event
from app.modules.identity.models import User
from app.modules.organizations.service import get_workspace, list_my_organizations


@strawberry.type
class UserType:
    id: UUID
    display_name: str


@strawberry.type
class OrganizationType:
    id: UUID
    name: str


@strawberry.type
class BranchType:
    id: UUID
    name: str


@strawberry.type
class WorkspaceType:
    organization: OrganizationType
    branches: list[BranchType]


@strawberry.type
class Query:
    @strawberry.field
    async def current_user(self, info: Info) -> UserType:
        async with session_factory() as db:
            user = await db.get(User, info.context["principal"].user_id)
            return UserType(id=user.id, display_name=user.display_name)

    @strawberry.field
    async def my_organizations(self, info: Info) -> list[OrganizationType]:
        async with session_factory() as db:
            organizations = await list_my_organizations(db, info.context["principal"])
            return [OrganizationType(id=org.id, name=org.name) for org in organizations]

    @strawberry.field
    async def clinic_workspace(self, info: Info, organization_id: UUID) -> WorkspaceType:
        async with session_factory.begin() as db:
            organization, branches = await get_workspace(
                db, info.context["principal"], organization_id
            )
            await append_event(
                db,
                info.context["principal"],
                info.context["request_context"],
                "workspace.read",
                organization_id=organization_id,
            )
            return WorkspaceType(
                organization=OrganizationType(id=organization.id, name=organization.name),
                branches=[BranchType(id=branch.id, name=branch.name) for branch in branches],
            )


schema = strawberry.Schema(query=Query)
