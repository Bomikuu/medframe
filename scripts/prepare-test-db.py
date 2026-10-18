"""Create/migrate the isolated PostgreSQL test database without exposing credentials."""

import asyncio
import os
import subprocess
from pathlib import Path

import asyncpg
from dotenv import dotenv_values

root = Path(__file__).resolve().parents[1]
values = dotenv_values(root / ".env")
if values.get("APP_ENV") == "production":
    raise SystemExit("Test database preparation is disabled in production.")
source = values["DATABASE_URL"]
test_url = source.rsplit("/", 1)[0] + "/medframe_test"


async def create():
    connection = await asyncpg.connect(
        source.replace("postgresql+asyncpg://", "postgresql://")
    )
    try:
        exists = await connection.fetchval(
            "SELECT 1 FROM pg_database WHERE datname=$1", "medframe_test"
        )
        if not exists:
            await connection.execute('CREATE DATABASE "medframe_test"')
    finally:
        await connection.close()


asyncio.run(create())
subprocess.run(
    [
        "uv",
        "run",
        "--project",
        "services/api",
        "alembic",
        "-c",
        "services/api/alembic.ini",
        "upgrade",
        "head",
    ],
    cwd=root,
    env={**os.environ, "DATABASE_URL": test_url},
    check=True,
)
print("Isolated medframe_test database is ready.")
