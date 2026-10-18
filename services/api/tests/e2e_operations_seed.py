# ruff: noqa: E402
"""Synthetic operations fixtures; all credentials are received through stdin."""

import json
import os
import sys
from pathlib import Path
from uuid import uuid4

import django

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.conf import settings

from config.crypto import cipher
from config.runtime import get_settings
from medframe_apps.accounts.models import MailOutbox, MfaCredential
from medframe_apps.organizations.models import Branch, Membership
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.services import register_patient
from medframe_apps.portal.invitations import issue_invitation
from tests_django.browser_seed import provision

allowed_databases = {"medframe_django_batch3"}
if os.environ.get("MEDFRAME_OPERATIONS_SEED_ACTIVE") == "1":
    allowed_databases.add("medframe_django")
if (
    get_settings().app_env == "production"
    or settings.DATABASES["default"]["NAME"] not in allowed_databases
):
    raise SystemExit("Operations browser seed is restricted to its synthetic rehearsal database")
data = json.load(sys.stdin)
for person in data["staff"]:
    org = provision(person, data["clinic"])
    member = Membership.objects.get(user__email=person["email"], organization=org)
    MfaCredential.objects.create(
        user=member.user,
        encrypted_secret=cipher().encrypt(person["secret"].encode()).decode(),
        confirmed=True,
    )
    if person["role"] == "dentist":
        doctor = member.user
branch = Branch.objects.get(organization=org, name="Main branch")
patient = register_patient(
    doctor,
    org.id,
    RegisterPatientInput(
        full_name="Synthetic Operations Browser Patient", branch_id=branch.id, request_id=uuid4()
    ),
)
admin = Membership.objects.get(organization=org, roles__name="clinic_administrator").user
issue_invitation(
    admin,
    org.id,
    patient.id,
    {
        "email": data["patient_email"],
        "relationship": "self",
        "method": "in_person",
        "attested": True,
        "note": "Synthetic browser identity only",
    },
    uuid4(),
)
payload = json.loads(
    cipher().decrypt(MailOutbox.objects.latest("created_at").encrypted_payload.encode())
)
print(
    json.dumps(
        {
            "organization": str(org.id),
            "patient": str(patient.id),
            "branch": str(branch.id),
            "invitation": payload["link"],
        }
    )
)
