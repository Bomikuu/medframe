"""Compare baseline identities and records around additive migrations, without exposing rows."""

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services/api"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django

django.setup()

from django.apps import apps
from django.conf import settings
from django.contrib.sessions.models import Session

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("mode", choices=["capture", "check"])
parser.add_argument("path", type=Path, help="Private checkpoint fingerprint path")
args = parser.parse_args()
if settings.DATABASES["default"]["NAME"] != "medframe_django":
    raise SystemExit(
        "This activation check is restricted to the original Django database."
    )
if ROOT in args.path.resolve().parents:
    raise SystemExit("Store preservation fingerprints outside the repository.")

labels = [
    "accounts.User",
    "accounts.MfaCredential",
    "accounts.RecoveryCode",
    "accounts.ClinicalSession",
    "accounts.PasswordReset",
    "accounts.MailOutbox",
    "organizations.Role",
    "auth.Group",
    "organizations.Organization",
    "organizations.Branch",
    "organizations.Membership",
    "patients.Patient",
    "patients.PatientAccessGrant",
    "patients.PatientClinicalRevision",
    "patients.PatientEvent",
    "patients.PatientRegistrationRequest",
    "providers.ProviderProfile",
    "encounters.Encounter",
    "encounters.EncounterDraft",
    "encounters.EncounterRevision",
    "encounters.ClinicalNote",
    "encounters.Diagnosis",
    "encounters.Observation",
    "encounters.EncounterTimelineLink",
    "dental.ToothFinding",
    "dental.DentalChartRevision",
    "treatments.Procedure",
    "treatments.TreatmentPlan",
    "treatments.TreatmentPlanItem",
    "treatments.TreatmentPlanEvent",
    "documents.Document",
    "documents.DocumentVersion",
    "branding.OrganizationBranding",
    "branding.UserPreferences",
    "auditing.AuditEvent",
]
models = [apps.get_model(label) for label in labels]
User = apps.get_model("accounts.User")
role_permissions = apps.get_model("organizations.Role").permissions.through
models.extend(
    [
        Session,
        apps.get_model("organizations.Membership").roles.through,
        User.groups.through,
        User.user_permissions.through,
        apps.get_model("auth.Group").permissions.through,
        role_permissions,
    ]
)
new_columns = {"realm", "kind", "template_revision_id"}
result = {}
for model in models:
    fields = [
        field.attname
        for field in model._meta.concrete_fields
        if field.attname not in new_columns
    ]
    rows = {}
    for row in (
        model.objects.values(*fields).order_by(model._meta.pk.attname).iterator()
    ):
        key = str(row[model._meta.pk.attname])
        rows[key] = hashlib.sha256(
            json.dumps(row, sort_keys=True, default=str, separators=(",", ":")).encode()
        ).hexdigest()
    result[model._meta.label] = rows
if args.mode == "capture":
    with args.path.open("x") as output:
        output.write(json.dumps(result, sort_keys=True) + "\n")
    args.path.chmod(0o600)
else:
    if json.loads(args.path.read_text()) != result:
        raise SystemExit(
            "Preservation mismatch: stop activation and investigate before accepting writes."
        )
print(
    json.dumps(
        {
            "mode": args.mode,
            "models": len(result),
            "rows": sum(len(rows) for rows in result.values()),
            "identical": args.mode == "check",
            "database": "medframe_django",
        }
    )
)
