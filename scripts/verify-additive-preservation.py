"""Fingerprint every original local row across an additive migration; never expose values."""

import argparse
import hashlib
import json
import os
import sys
from collections import Counter
from pathlib import Path

import django
import psycopg
from django.conf import settings
from psycopg import sql

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services/api"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

django.setup()

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("mode", choices=["capture", "check"])
parser.add_argument("path", type=Path)
args = parser.parse_args()
database = settings.DATABASES["default"]
if database["NAME"] != "medframe_django" or ROOT in args.path.resolve().parents:
    raise SystemExit(
        "Use the original local Django database and a private output path."
    )

expected = json.loads(args.path.read_text()) if args.mode == "check" else None
result = {}
columns = {}
with psycopg.connect(
    dbname=database["NAME"],
    user=database["USER"],
    password=database["PASSWORD"],
    host=database["HOST"],
    port=database["PORT"],
) as connection:
    connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
    connection.execute("SET LOCAL TIME ZONE 'UTC'")
    tables = [
        row[0]
        for row in connection.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
        )
    ]
    selected = list(expected["tables"]) if expected else tables
    if not set(selected) <= set(tables):
        raise SystemExit("An original table is missing; stop activation.")
    for table in selected:
        actual_columns = [
            row[0]
            for row in connection.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema='public' AND table_name=%s ORDER BY ordinal_position",
                [table],
            )
        ]
        selected_columns = (
            expected.get("columns", {}).get(table, actual_columns)
            if expected
            else actual_columns
        )
        if not set(selected_columns) <= set(actual_columns):
            raise SystemExit(
                f"An original column is missing in {table}; stop activation."
            )
        columns[table] = selected_columns
        query = sql.SQL(
            "SELECT row_to_json(t)::text FROM (SELECT {} FROM {}) t"
        ).format(
            sql.SQL(", ").join(map(sql.Identifier, selected_columns)),
            sql.Identifier(table),
        )
        hashes = Counter()
        with connection.cursor() as cursor:
            cursor.execute(query)
            for row in cursor:
                canonical = json.dumps(
                    json.loads(row[0]), sort_keys=True, separators=(",", ":")
                )
                hashes[hashlib.sha256(canonical.encode()).hexdigest()] += 1
        result[table] = dict(hashes)

if args.mode == "capture":
    payload = {"database": database["NAME"], "tables": result, "columns": columns}
    descriptor = os.open(args.path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as output:
        json.dump(payload, output, sort_keys=True)
else:
    allowed_additions = {
        "auth_permission",
        "django_content_type",
        "django_migrations",
        "organizations_role_permissions",
    }
    for table, before in expected["tables"].items():
        missing = Counter(before) - Counter(result[table])
        unexpected = Counter(result[table]) - Counter(before)
        # Batch 5 introduces exactly this role; existing role fingerprints still must match.
        if table == "organizations_role" and unexpected:
            role = json.dumps(
                {"name": "diagnostic_operator"}, sort_keys=True, separators=(",", ":")
            )
            permitted = Counter({hashlib.sha256(role.encode()).hexdigest(): 1})
            unexpected -= permitted
        if missing or (unexpected and table not in allowed_additions):
            raise SystemExit(
                f"Original-row preservation failed in {table}; stop activation."
            )
print(
    json.dumps(
        {
            "mode": args.mode,
            "tables": len(result),
            "original_rows": sum(
                sum(rows.values())
                for rows in (expected["tables"] if expected else result).values()
            ),
            "preserved": args.mode == "check",
        }
    )
)
