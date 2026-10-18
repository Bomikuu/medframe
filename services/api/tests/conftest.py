import os
import secrets
from pathlib import Path

import pytest_asyncio
from dotenv import dotenv_values
from sqlalchemy import text

root = Path(__file__).resolve().parents[3]
values = dotenv_values(root / ".env")
os.environ["DATABASE_URL"] = values["DATABASE_URL"].rsplit("/", 1)[0] + "/medframe_test"
os.environ["REDIS_URL"] = "redis://127.0.0.1:56379/15"
os.environ["APP_ENV"] = "test"

from app.adapters.rate_limit import redis  # noqa: E402
from app.core.database import session_factory  # noqa: E402
from app.modules.identity.provision import provision_staff  # noqa: E402


@pytest_asyncio.fixture(autouse=True)
async def isolated_data():
    async with session_factory.begin() as db:
        tables = await db.scalars(
            text(
                "SELECT tablename FROM pg_tables WHERE schemaname='public' "
                "AND tablename NOT IN "
                "('alembic_version', 'roles', 'permissions', 'role_permissions')"
            )
        )
        names = list(tables)
        if names:
            await db.execute(
                text("TRUNCATE " + ", ".join(f'"{name}"' for name in names) + " CASCADE")
            )
    await redis.flushdb()
    yield


@pytest_asyncio.fixture
async def staff():
    password = secrets.token_urlsafe(24)
    email = "dentist@example.org"
    await provision_staff(
        email, "Dr. Althea Reyes", "Synthetic Dental Clinic", "Main branch", "dentist", password
    )
    return email, password
