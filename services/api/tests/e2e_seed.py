"""Seed synthetic browser-test staff. Credentials arrive on stdin, never as arguments."""

import asyncio
import json
import sys

from app.adapters.rate_limit import redis
from app.core.config import get_settings
from app.core.security import digest
from app.modules.identity.provision import provision_staff


async def main():
    if get_settings().app_env == "production":
        raise RuntimeError("Synthetic browser fixtures must never run in production")
    for bucket in ("login", "mfa", "recovery", "graphql"):
        await redis.delete(f"medframe:{bucket}:{digest('client:127.0.0.1')}")
    await redis.delete(f"medframe:recovery:{digest('identity:not-registered@example.org')}")
    data = json.load(sys.stdin)
    for clinic in ("Synthetic Harbor Dental", "Synthetic Riverside Dental"):
        await provision_staff(
            data["email"],
            "Dr. Althea Reyes (test)",
            clinic,
            "Main branch",
            "dentist",
            data["password"],
        )


if __name__ == "__main__":
    asyncio.run(main())
