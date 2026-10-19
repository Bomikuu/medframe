"""Synthetic Dental fixture and native MFA-complete sessions in an isolated clone only."""

import json
import os
import secrets
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.conf import settings
from django.contrib.auth import login
from django.contrib.sessions.backends.db import SessionStore
from django.test import RequestFactory
from django.utils import timezone
from medframe_apps.accounts.models import ClinicalSession, User
from medframe_apps.encounters.services import create_encounter
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.organizations.policy import seed_roles
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.services import register_patient
from medframe_apps.providers.models import ProviderProfile

if (
    settings.DATABASES["default"]["NAME"]
    != "medframe_django_dental_illustration_review_20261019"
):
    raise SystemExit("Use the isolated Station review database only.")

seed_roles()
stamp = secrets.token_hex(4)
organization = Organization.objects.create(name="Synthetic Dental Clinic " + stamp)
branch = Branch.objects.create(organization=organization, name="Review branch")
users = {}
for name, role in [("admin", "clinic_administrator"), ("doctor", "dentist")]:
    user = User.objects.create_user(
        f"{name}-{stamp}@station.example.test",
        secrets.token_urlsafe(32),
        display_name="Synthetic " + name.title(),
    )
    membership = Membership.objects.create(
        user=user, organization=organization, branch=branch
    )
    membership.roles.add(role)
    users[name] = user
    if name == "doctor":
        provider = ProviderProfile.objects.create(
            membership=membership, specialty="dentistry"
        )
patient = register_patient(
    users["doctor"],
    organization.id,
    RegisterPatientInput(
        full_name="Synthetic Dental Patient",
        branch_id=branch.id,
        request_id=uuid4(),
    ),
)
encounter = create_encounter(
    users["doctor"],
    organization.id,
    patient.id,
    provider.id,
    branch.id,
    "Dental illustration review",
    uuid4(),
)


def session(user):
    request = RequestFactory().post("/auth/mfa/verify")
    request.session = SessionStore()
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    request.session["mfa_verified"] = True
    request.session["auth_realm"] = "staff"
    request.session.save()
    ClinicalSession.objects.create(
        user=user,
        session_key=request.session.session_key,
        last_seen_at=timezone.now(),
        expires_at=timezone.now() + timedelta(hours=8),
    )
    return request.session.session_key


fixture = {
    "organization": str(organization.id),
    "branch": str(branch.id),
    "encounter": str(encounter.id),
    "patient": str(patient.id),
    "admin_session": session(users["admin"]),
    "sender_session": session(users["doctor"]),
    "receiver_session": session(users["doctor"]),
}
folder = Path.home() / ".local/share/medframe/ui-review"
folder.mkdir(mode=0o700, parents=True, exist_ok=True)
target = folder / "dental-illustration.json"
target.write_text(json.dumps(fixture))
target.chmod(0o600)
print("Synthetic Dental fixture and native test sessions saved privately.")
