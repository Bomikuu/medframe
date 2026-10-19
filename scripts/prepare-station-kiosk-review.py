"""Create synthetic kiosk/admin/portal fixtures only in the named isolated clone."""

import json
import os
import secrets
from datetime import time, timedelta
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()
from django.conf import settings
from django.contrib.auth import login
from django.contrib.sessions.backends.db import SessionStore
from django.test import RequestFactory
from django.utils import timezone
from medframe_apps.accounts.models import ClinicalSession, User
from medframe_apps.billing.invoices import invoice_action
from medframe_apps.operations.models import Appointment, ProviderSchedule
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.organizations.policy import seed_roles
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.services import register_patient
from medframe_apps.portal.models import PortalInvitation, PortalLink
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.stations.context import digest
from medframe_apps.stations.models import (
    DeviceCredential,
    StationDepartment,
    StationDevice,
)

assert (
    settings.DATABASES["default"]["NAME"]
    == "medframe_django_station_kiosk_review_20261019"
)
seed_roles()
stamp = secrets.token_hex(4)
organization = Organization.objects.create(name="Synthetic Care Clinic " + stamp)
branch = Branch.objects.create(organization=organization, name="Main reception")
admin = User.objects.create_user(
    f"admin-{stamp}@kiosk.example.test",
    secrets.token_urlsafe(32),
    display_name="Synthetic Reception",
)
admin_member = Membership.objects.create(
    user=admin, organization=organization, branch=branch
)
admin_member.roles.add("clinic_administrator")
doctor = User.objects.create_user(
    f"doctor-{stamp}@kiosk.example.test",
    secrets.token_urlsafe(32),
    display_name="Dr. Synthetic",
)
member = Membership.objects.create(
    user=doctor, organization=organization, branch=branch
)
member.roles.add("dentist")
provider = ProviderProfile.objects.create(membership=member, specialty="dentistry")
patient = register_patient(
    admin,
    organization.id,
    RegisterPatientInput(
        full_name="Synthetic Kiosk Patient",
        phone="09001112222",
        branch_id=branch.id,
        request_id=uuid4(),
    ),
)
second = register_patient(
    admin,
    organization.id,
    RegisterPatientInput(
        full_name="Synthetic Check-in Patient",
        phone="09003334444",
        branch_id=branch.id,
        request_id=uuid4(),
    ),
)
portal_user = User.objects.create_user(
    f"patient-{stamp}@kiosk.example.test",
    secrets.token_urlsafe(32),
    display_name="Synthetic Patient",
)
invitation = PortalInvitation.objects.create(
    organization=organization,
    patient=patient,
    issued_by=admin,
    email=portal_user.email,
    relationship="self",
    method="in_person",
    token_hash=digest(secrets.token_urlsafe(32)),
    expires_at=timezone.now() + timedelta(days=1),
)
link = PortalLink.objects.create(
    organization=organization,
    patient=patient,
    user=portal_user,
    invitation=invitation,
    relationship="self",
)
device = StationDevice.objects.create(
    organization=organization,
    branch=branch,
    name="Synthetic Reception Kiosk",
    mode="kiosk",
    state="active",
    functions=["booking", "check_in", "walk_in", "payments"],
    created_by=admin,
)
secret = secrets.token_urlsafe(32)
DeviceCredential.objects.create(
    device=device,
    digest=digest(secret),
    verification_phrase="KIOSK2",
    expires_at=timezone.now() + timedelta(days=1),
)
departments = {}
for name, prefix, kind in [
    ("Consultation", "C", "consultation"),
    ("Laboratory", "L", "laboratory"),
    ("Cashier", "P", "cashier"),
]:
    department = StationDepartment.objects.create(
        branch=branch, name=name, prefix=prefix, kind=kind
    )
    departments[kind] = str(department.id)
day = timezone.now().astimezone(ZoneInfo(organization.timezone)).date() + timedelta(
    days=1
)
ProviderSchedule.objects.create(
    provider=provider,
    branch=branch,
    weekday=day.weekday(),
    effective_from=day,
    effective_to=day,
    opens=time(8),
    closes=time(17),
    duration=30,
)
appointment = Appointment.objects.create(
    organization=organization,
    branch=branch,
    patient=second,
    provider=provider,
    start=timezone.now() + timedelta(minutes=10),
    end=timezone.now() + timedelta(minutes=40),
    created_by=admin,
)


def session(user, realm):
    request = RequestFactory().post("/auth/mfa/verify")
    request.session = SessionStore()
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    request.session["mfa_verified"] = True
    request.session["auth_realm"] = realm
    request.session.save()
    ClinicalSession.objects.create(
        user=user,
        realm=realm,
        session_key=request.session.session_key,
        last_seen_at=timezone.now(),
        expires_at=timezone.now() + timedelta(hours=8),
    )
    return request.session.session_key


billing_request = RequestFactory().post("/graphql")
billing_request.user = admin
billing_request.session = {"mfa_verified": True, "auth_realm": "staff"}
for owner, description, amount in [
    (patient, "Synthetic consultation service", "750.00"),
    (second, "Other patient private invoice", "1400.00"),
]:
    row = invoice_action(
        billing_request,
        organization.id,
        "save",
        {
            "branch_id": str(branch.id),
            "patient_id": str(owner.id),
            "due_date": day.isoformat(),
            "lines": [{"description": description, "unit_amount": amount}],
            "expected_version": 0,
        },
        uuid4(),
    )
    invoice_action(
        billing_request,
        organization.id,
        "issue",
        {"id": str(row.id), "expected_version": row.version},
        uuid4(),
    )

fixture = {
    "organization": str(organization.id),
    "branch": str(branch.id),
    "patient": str(patient.id),
    "second_patient": str(second.id),
    "provider": str(provider.id),
    "device": str(device.id),
    "device_cookie": secret,
    "departments": departments,
    "admin_session": session(admin, "staff"),
    "portal_session": session(portal_user, "patient"),
    "link": str(link.id),
    "date": day.isoformat(),
    "appointment": str(appointment.id),
}
p = Path.home() / ".local/share/medframe/ui-review/station-kiosk.json"
p.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
p.write_text(json.dumps(fixture))
p.chmod(0o600)
print(
    "Synthetic kiosk/portal/staff fixtures saved privately; no original records used."
)
