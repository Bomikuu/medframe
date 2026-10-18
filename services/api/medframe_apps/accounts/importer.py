"""Read-only snapshot import. Never writes to the preserved source connection."""

import hashlib
import json

import psycopg
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.utils import timezone
from psycopg.rows import dict_row

from config.runtime import get_settings
from medframe_apps.accounts.hashers import encode_legacy_password
from medframe_apps.accounts.models import ImportRun, MfaCredential, RecoveryCode, User
from medframe_apps.auditing.models import AuditEvent
from medframe_apps.organizations.models import Branch, Membership, Organization, Role
from medframe_apps.organizations.policy import seed_roles
from medframe_apps.patients.models import (
    Patient,
    PatientAccessGrant,
    PatientClinicalRevision,
    PatientEvent,
    PatientRegistrationRequest,
)
from medframe_apps.providers.models import ProviderProfile

TABLES = [
    "users",
    "organizations",
    "branches",
    "memberships",
    "membership_roles",
    "roles",
    "permissions",
    "role_permissions",
    "mfa_credentials",
    "recovery_codes",
    "patients",
    "patient_access_grants",
    "patient_clinical_revisions",
    "patient_events",
    "patient_registration_requests",
    "audit_events",
]


def canonical(value):
    return json.dumps(value, sort_keys=True, default=str, separators=(",", ":"))


def snapshot_source():
    url = get_settings().database_url.get_secret_value().replace("+asyncpg", "")
    with psycopg.connect(url, row_factory=dict_row) as source:
        source.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        snapshot = {}
        for table in TABLES:
            rows = list(
                source.execute(
                    psycopg.sql.SQL("SELECT * FROM {}").format(psycopg.sql.Identifier(table))
                )
            )
            snapshot[table] = sorted(rows, key=canonical)
    return snapshot


def fingerprint(snapshot):
    return hashlib.sha256(canonical(snapshot).encode()).hexdigest()


def mappings(snapshot):
    """Return explicit source-to-Django projections; no sessions or reset material."""
    users = []
    for row in snapshot["users"]:
        users.append(
            {
                "id": row["id"],
                "created_at": row["created_at"],
                "email": row["email"],
                "display_name": row["display_name"],
                "password": encode_legacy_password(row["password_hash"]),
                "is_active": row["active"],
                "legacy_password_digest": hashlib.sha256(row["password_hash"].encode()).hexdigest(),
            }
        )
    patients = [
        {
            ("registered_by_id" if key == "registered_by" else key): value
            for key, value in row.items()
        }
        for row in snapshot["patients"]
    ]
    grants = [
        {
            (
                "granted_by_id"
                if key == "granted_by"
                else "revoked_by_id"
                if key == "revoked_by"
                else key
            ): value
            for key, value in row.items()
        }
        for row in snapshot["patient_access_grants"]
    ]
    return [
        (User, users),
        (Organization, snapshot["organizations"]),
        (Branch, snapshot["branches"]),
        (Membership, snapshot["memberships"]),
        (MfaCredential, snapshot["mfa_credentials"]),
        (RecoveryCode, snapshot["recovery_codes"]),
        (Patient, patients),
        (PatientAccessGrant, grants),
        (PatientClinicalRevision, snapshot["patient_clinical_revisions"]),
        (PatientEvent, snapshot["patient_events"]),
        (PatientRegistrationRequest, snapshot["patient_registration_requests"]),
        (AuditEvent, snapshot["audit_events"]),
    ]


def reconcile(snapshot):
    failures = []
    for model, rows in mappings(snapshot):
        for row in rows:
            key = "id" if "id" in row else "user_id"
            target = model.objects.filter(pk=row[key]).values(*row.keys()).first()
            if model is User and target and target["password"].startswith("argon2$"):
                # A successful native login upgrades the imported hash; retain its source digest.
                target["password"] = row["password"]
            if target is None or canonical(target) != canonical(row):
                failures.append(model._meta.label)
                break
    for row in snapshot["membership_roles"]:
        if not Membership.objects.filter(id=row["membership_id"], roles__name=row["role"]).exists():
            failures.append("organizations.Membership.roles")
    for row in snapshot["role_permissions"]:
        if not Role.objects.filter(
            name=row["role"], permissions__codename=row["permission"]
        ).exists():
            failures.append("organizations.Role.permissions")
    if failures:
        raise ValueError("Reconciliation failed for: " + ", ".join(failures))
    return {table: len(rows) for table, rows in snapshot.items()}


@transaction.atomic
def import_snapshot(snapshot, apply=False, verify=False):
    digest = fingerprint(snapshot)
    previous = ImportRun.objects.select_for_update().first()
    if previous and previous.source_fingerprint != digest:
        raise ValueError(
            "Source changed since rehearsal. Use a fresh separate target for a new reconciled "
            "import; do not overwrite imported clinical data."
        )
    if verify or previous:
        counts = reconcile(snapshot)
        if previous:
            previous.verified_at = timezone.now()
            previous.save(update_fields=["verified_at"])
        return counts
    projections = mappings(snapshot)
    counts = {table: len(rows) for table, rows in snapshot.items()}
    if not apply:
        return counts
    if User.objects.exists() or Organization.objects.exists():
        raise ValueError(
            "Target is not empty and has no matching import ledger. Refusing to overwrite."
        )
    seed_roles()
    content_type = ContentType.objects.get_for_model(Membership)
    for row in snapshot["roles"]:
        role, _ = Role.objects.get_or_create(name=row["name"])
        source_permissions = {
            entry["permission"]
            for entry in snapshot["role_permissions"]
            if entry["role"] == role.name
        }
        if "patients.clinical.write" in source_permissions and role.name in {"doctor", "dentist"}:
            source_permissions.update({"encounters.write", "treatments.write", "documents.write"})
        role.permissions.set(
            [
                Permission.objects.get_or_create(
                    content_type=content_type, codename=code, defaults={"name": code}
                )[0]
                for code in source_permissions
            ]
        )
    for model, rows in projections:
        model.objects.bulk_create([model(**row) for row in rows], batch_size=500)
    for row in snapshot["membership_roles"]:
        member = Membership.objects.get(id=row["membership_id"])
        if not member.roles.model.objects.filter(name=row["role"]).exists():
            raise ValueError("Unknown legacy role; explicit permission mapping is required.")
        member.roles.add(row["role"])
        if row["role"] in {"doctor", "dentist"}:
            ProviderProfile.objects.get_or_create(
                membership=member,
                defaults={
                    "specialty": "dentistry" if row["role"] == "dentist" else "general_medicine"
                },
            )
    counts = reconcile(snapshot)
    ImportRun.objects.create(source_fingerprint=digest, counts=counts, verified_at=timezone.now())
    return counts
