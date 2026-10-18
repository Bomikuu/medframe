import argparse
import asyncio
from getpass import getpass

from sqlalchemy import select

from app.core.database import session_factory
from app.core.request_context import RequestContext
from app.modules.audit.service import append_event
from app.modules.identity.models import User
from app.modules.identity.passwords import hash_password, normalize_email
from app.modules.organizations.models import Branch, Membership, MembershipRole, Organization
from app.modules.organizations.permissions import ROLE_PERMISSIONS


async def provision_staff(
    email: str,
    display_name: str,
    organization_name: str,
    branch_name: str,
    role: str,
    password: str | None,
) -> None:
    if role not in ROLE_PERMISSIONS or role == "patient":
        raise ValueError("Choose a staff role")
    if not all(value.strip() for value in (display_name, organization_name, branch_name)):
        raise ValueError("Names must not be empty")
    async with session_factory.begin() as db:
        user = await db.scalar(select(User).where(User.email == normalize_email(email)))
        if user is None:
            if password is None:
                raise ValueError("A new staff member requires a password")
            user = User(
                email=normalize_email(email),
                display_name=display_name,
                password_hash=hash_password(password),
            )
            db.add(user)
            await db.flush()
        organization = await db.scalar(
            select(Organization).where(Organization.name == organization_name)
        )
        if organization is None:
            organization = Organization(name=organization_name)
            db.add(organization)
            await db.flush()
        branch = await db.scalar(
            select(Branch).where(
                Branch.organization_id == organization.id,
                Branch.name == branch_name,
            )
        )
        if branch is None:
            branch = Branch(organization_id=organization.id, name=branch_name)
            db.add(branch)
            await db.flush()
        membership = await db.scalar(
            select(Membership).where(
                Membership.user_id == user.id,
                Membership.organization_id == organization.id,
            )
        )
        if membership is None:
            membership = Membership(
                user_id=user.id, organization_id=organization.id, branch_id=branch.id
            )
            db.add(membership)
            await db.flush()
        if await db.get(MembershipRole, (membership.id, role)) is None:
            db.add(MembershipRole(membership_id=membership.id, role=role))
        await append_event(
            db,
            None,
            RequestContext("staff-provisioning", "local", None),
            "staff.provisioned",
            organization.id,
            user.id,
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Provision an explicitly authorized staff membership."
    )
    parser.add_argument("--email")
    parser.add_argument("--name")
    parser.add_argument("--organization")
    parser.add_argument("--branch")
    parser.add_argument("--role", choices=[role for role in ROLE_PERMISSIONS if role != "patient"])
    args = parser.parse_args()
    email = args.email or input("Staff email: ")
    name = args.name or input("Display name: ")
    organization = args.organization or input("Organization name: ")
    branch = args.branch or input("Branch name: ")
    role = args.role or input("Role (e.g. dentist): ")
    password = getpass("Password for a NEW user (leave blank for an existing user): ")
    asyncio.run(provision_staff(email, name, organization, branch, role, password or None))
    print("Staff membership provisioned. MFA enrollment is required at first sign-in.")


if __name__ == "__main__":
    main()
