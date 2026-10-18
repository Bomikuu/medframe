"""Create only the configured separate Django development database, if absent."""

import os

import django
import psycopg
from config.runtime import get_settings
from psycopg import sql

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.conf import settings

if get_settings().app_env == "production":
    raise SystemExit("Automatic database creation is disabled in production.")
database = settings.DATABASES["default"]
with psycopg.connect(
    dbname="postgres",
    user=database["USER"],
    password=database["PASSWORD"],
    host=database["HOST"],
    port=database["PORT"],
    autocommit=True,
) as connection:
    exists = connection.execute(
        "SELECT 1 FROM pg_database WHERE datname=%s", [database["NAME"]]
    ).fetchone()
    if not exists:
        connection.execute(
            sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database["NAME"]))
        )
print("Separate Django database is ready. No existing database or account was changed.")
