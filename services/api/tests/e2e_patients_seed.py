"""Create synthetic patient-test staff without receiving secrets in command arguments."""

import asyncio
import json
import sys

from sqlalchemy import select

from app.adapters.rate_limit import redis
from app.core.config import get_settings
from app.core.database import session_factory
from app.core.security import digest
from app.modules.identity.models import User
from app.modules.identity.provision import provision_staff
from app.modules.organizations.models import Branch, Membership, Organization


async def main():
    if get_settings().app_env == "production":
        raise RuntimeError("Synthetic fixtures are disabled in production")
    data = json.load(sys.stdin)
    for bucket in ("login", "mfa", "graphql"):
        await redis.delete(f"medframe:{bucket}:{digest('client:127.0.0.1')}")
    for person in data["staff"]:
        await provision_staff(
            person["email"],
            person["name"],
            data["clinic"],
            "Main branch",
            person["role"],
            person["password"],
        )
        if "Safety" in person["name"]:
            async with session_factory.begin() as db:
                user = await db.scalar(select(User).where(User.email == person["email"]))
                clinic = await db.scalar(
                    select(Organization).where(Organization.name == data["clinic"])
                )
                member = await db.scalar(
                    select(Membership).where(
                        Membership.user_id == user.id, Membership.organization_id == clinic.id
                    )
                )
                member.branch_id = None
                db.add(Branch(organization_id=clinic.id, name="Secondary branch"))
            await provision_staff(
                person["email"],
                person["name"],
                data["clinic"] + " Second",
                "Main branch",
                person["role"],
                None,
            )


if __name__ == "__main__":
    asyncio.run(main())
