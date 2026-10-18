"""Encrypt a consistent local Django backup and optionally restore a new rehearsal DB.

Run through uv. No plaintext dump or configured secret is printed/written.
"""

import argparse
import hashlib
import json
import os
import subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import django
import psycopg
from cryptography.fernet import Fernet
from psycopg import sql

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from config.runtime import ROOT, get_settings
from django.conf import settings

parser = argparse.ArgumentParser()
parser.add_argument("--clone")
args = parser.parse_args()
runtime = get_settings()
database = settings.DATABASES["default"]
if runtime.app_env == "production" or not database["NAME"].startswith(
    "medframe_django"
):
    raise SystemExit("Checkpoint helper is restricted to local Django databases.")
revision = (
    subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT)
    .decode()
    .strip()
)
stamp = datetime.now(ZoneInfo("Asia/Manila")).strftime("%Y%m%d-%H%M%S")
folder = (
    Path.home() / ".local/share/medframe/checkpoints" / f"pre-batch2-{stamp}-{revision}"
)
folder.mkdir(parents=True, mode=0o700)
connection_args = {
    "user": database["USER"],
    "password": database["PASSWORD"],
    "host": database["HOST"],
    "port": database["PORT"],
}
with psycopg.connect(dbname=database["NAME"], **connection_args) as connection:
    connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
    snapshot = connection.execute("SELECT pg_export_snapshot()").fetchone()[0]
    tables = [
        row[0]
        for row in connection.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
        )
    ]
    counts = {
        table: connection.execute(
            sql.SQL("SELECT count(*) FROM {}").format(sql.Identifier(table))
        ).fetchone()[0]
        for table in tables
    }
    dump = subprocess.run(
        [
            "docker",
            "exec",
            "medframe-db-1",
            "pg_dump",
            "-U",
            database["USER"],
            "-Fc",
            "--no-owner",
            "--snapshot",
            snapshot,
            database["NAME"],
        ],
        capture_output=True,
        check=True,
    ).stdout
archive = Fernet(runtime.encryption_key.get_secret_value().encode()).encrypt(dump)
(folder / "database.dump.fernet").write_bytes(archive)
(folder / "configuration.env").write_bytes((ROOT / ".env").read_bytes())
subprocess.run(
    ["git", "bundle", "create", str(folder / "source.bundle"), "--all"],
    cwd=ROOT,
    check=True,
    capture_output=True,
)
subprocess.run(
    ["git", "bundle", "verify", str(folder / "source.bundle")],
    cwd=ROOT,
    check=True,
    capture_output=True,
)
if args.clone:
    if not args.clone.startswith("medframe_django_") or args.clone == database["NAME"]:
        raise SystemExit("Choose a new local rehearsal database name.")
    with psycopg.connect(
        dbname="postgres", autocommit=True, **connection_args
    ) as connection:
        if connection.execute(
            "SELECT 1 FROM pg_database WHERE datname=%s", [args.clone]
        ).fetchone():
            raise SystemExit("Rehearsal database already exists; nothing overwritten.")
        connection.execute(
            sql.SQL("CREATE DATABASE {}").format(sql.Identifier(args.clone))
        )
    subprocess.run(
        [
            "docker",
            "exec",
            "-i",
            "medframe-db-1",
            "pg_restore",
            "-U",
            database["USER"],
            "-d",
            args.clone,
            "--no-owner",
            "--no-acl",
            "--exit-on-error",
        ],
        input=dump,
        check=True,
        capture_output=True,
    )
    with psycopg.connect(dbname=args.clone, **connection_args) as connection:
        restored = {
            table: connection.execute(
                sql.SQL("SELECT count(*) FROM {}").format(sql.Identifier(table))
            ).fetchone()[0]
            for table in tables
        }
    if counts != restored:
        raise SystemExit("Restore counts did not reconcile; originals untouched.")
manifest = {
    "commit": revision,
    "database": database["NAME"],
    "clone": args.clone,
    "counts": counts,
    "dump_sha256": hashlib.sha256(dump).hexdigest(),
    "encrypted_sha256": hashlib.sha256(archive).hexdigest(),
    "source_written": False,
    "plaintext_dump_written": False,
}
(folder / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
for file in folder.iterdir():
    file.chmod(0o600)
print(
    json.dumps(
        {
            "checkpoint": str(folder),
            "clone": args.clone,
            "tables_verified": len(tables),
            "source_written": False,
        }
    )
)
