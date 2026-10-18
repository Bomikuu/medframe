from uuid import UUID

import strawberry
from django.db import transaction
from strawberry.types import Info
from strawberry_django.optimizer import DjangoOptimizerExtension

from api_graphql.clinical import ClinicalMutation, ClinicalQuery
from api_graphql.contract_aliases import ContractMutation, ContractQuery
from api_graphql.patients import PatientMutation, PatientQuery
from api_graphql.workspace import WorkspaceMutation, WorkspaceQuery
from medframe_apps.auditing.services import audit
from medframe_apps.organizations.models import Branch, Organization
from medframe_apps.organizations.policy import permissions_for, require_membership


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
    permissions: list[str]


@strawberry.type
class Query(PatientQuery, ClinicalQuery, WorkspaceQuery, ContractQuery):
    @strawberry.field
    def current_user(self, info: Info) -> UserType:
        return UserType(id=info.context.user.id, display_name=info.context.user.display_name)

    @strawberry.field
    def my_organizations(self, info: Info) -> list[OrganizationType]:
        queryset = Organization.objects.filter(
            membership__user=info.context.user, membership__active=True, active=True
        ).order_by("name")[:50]
        return [OrganizationType(id=item.id, name=item.name) for item in queryset]

    @strawberry.field
    @transaction.atomic
    def clinic_workspace(self, info: Info, organization_id: UUID) -> WorkspaceType:
        member = require_membership(info.context.user, organization_id, "workspace.read")
        branches = Branch.objects.filter(organization_id=organization_id)
        if member.branch_id:
            branches = branches.filter(id=member.branch_id)
        audit(info.context.user, "workspace.read", organization_id)
        return WorkspaceType(
            organization=OrganizationType(id=member.organization_id, name=member.organization.name),
            branches=[
                BranchType(id=item.id, name=item.name) for item in branches.order_by("name")[:50]
            ],
            permissions=sorted(permissions_for(member)),
        )


class PrivateSchema(strawberry.Schema):
    def process_errors(self, errors, execution_context=None):
        pass  # Error responses are sanitized at the HTTP boundary; never log clinical inputs.


@strawberry.type
class Mutation(PatientMutation, ClinicalMutation, WorkspaceMutation, ContractMutation):
    pass


schema = PrivateSchema(query=Query, mutation=Mutation, extensions=[DjangoOptimizerExtension])
