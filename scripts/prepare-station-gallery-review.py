"""Synthetic Station fixture and native MFA-complete sessions in an isolated clone only."""

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
    != "medframe_django_station_gallery_review_20261019"
):
    raise SystemExit("Use the isolated Station review database only.")

seed_roles()
stamp = secrets.token_hex(4)
organization = Organization.objects.create(name="Synthetic Station Clinic " + stamp)
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
        full_name="Synthetic Station Patient",
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
    "Station handoff review",
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
target = folder / "station-gallery.json"
target.write_text(json.dumps(fixture))
target.chmod(0o600)
print("Synthetic Station fixture and native test sessions saved privately.")


from medframe_apps.stations.context import digest
from medframe_apps.stations.models import DeviceCredential, StationDevice

target = Path.home() / ".local/share/medframe/ui-review/station-gallery.json"
fixture = json.loads(target.read_text())
device = StationDevice.objects.create(
    organization_id=fixture["organization"],
    branch_id=fixture["branch"],
    name="Synthetic code tablet",
    mode="clinician",
    state="active",
    functions=["clinical.read", "clinical.write"],
    created_by_id=ClinicalSession.objects.get(
        session_key=fixture["admin_session"]
    ).user_id,
)
secret = secrets.token_urlsafe(32)
DeviceCredential.objects.create(
    device=device,
    digest=digest(secret),
    verification_phrase="ABCD23",
    expires_at=timezone.now() + timedelta(days=30),
)
fixture["device_cookie"] = secret
target.write_text(json.dumps(fixture))
target.chmod(0o600)
print(
    "Prepared approved synthetic tablet; no receiving staff session is used in browser acceptance."
)


# Deterministic synthetic daily workflow; never append this fixture to originals.
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, ImageDraw, ImageFont
from medframe_apps.documents.models import Document, DocumentVersion
from medframe_apps.operations.models import (
    Appointment,
    QueueDay,
    QueueTicket,
    OperationsEvent,
)
from zoneinfo import ZoneInfo

assert (
    settings.STORAGES["default"]["OPTIONS"]["bucket_name"]
    == "medframe-review-station-gallery-20261019"
)
now = timezone.now()
patient_rows = [patient]
for label in [
    "Synthetic Follow-up Patient",
    "Synthetic Rescheduled Patient",
    "Synthetic Tomorrow Patient",
]:
    patient_rows.append(
        register_patient(
            users["doctor"],
            organization.id,
            RegisterPatientInput(
                full_name=label, branch_id=branch.id, request_id=uuid4()
            ),
        )
    )
slots = []
for index, row in enumerate(patient_rows):
    start = now + timedelta(minutes=[-60, -35, 40, 24 * 60][index])
    slots.append(
        Appointment.objects.create(
            organization=organization,
            branch=branch,
            patient=row,
            provider=provider,
            start=start,
            end=start + timedelta(minutes=30),
            created_by=users["doctor"],
            reason=[
                "Dental examination",
                "Follow-up review",
                "Rescheduled examination",
                "Tomorrow follow-up",
            ][index],
            status="checked_in" if index == 0 else "booked",
        )
    )
day = QueueDay.objects.create(
    branch=branch,
    date=now.astimezone(ZoneInfo(organization.timezone)).date(),
    next_number=2,
)
QueueTicket.objects.create(
    day=day,
    patient=patient,
    provider=provider,
    appointment=slots[0],
    encounter=encounter,
    number=1,
    order=1024,
    status="waiting",
    delay=12,
    created_by=users["doctor"],
    created_at=slots[0].start + timedelta(minutes=15),
)
OperationsEvent.objects.create(
    branch=branch,
    actor=users["doctor"],
    object_id=slots[2].id,
    kind="appointment.rescheduled",
    before={"start": (slots[2].start - timedelta(hours=1)).isoformat()},
    after={"start": slots[2].start.isoformat()},
)
picture = Image.new("RGB", (160, 160), (215, 239, 237))
draw = ImageDraw.Draw(picture)
draw.text((60, 55), "S", fill=(16, 42, 67), font=ImageFont.load_default(size=40))
output = BytesIO()
picture.save(output, format="PNG")
key = default_storage.save(
    "synthetic/station-gallery-" + stamp + ".png", ContentFile(output.getvalue())
)
document = Document.objects.create(
    organization=organization,
    patient=patient,
    purpose="clinical",
    uploaded_by=users["doctor"],
    label="Synthetic patient portrait",
)
image = DocumentVersion.objects.create(
    document=document,
    uploaded_by=users["doctor"],
    key=key,
    filename="portrait.png",
    content_type="image/png",
    expected_size=len(output.getvalue()),
    size=len(output.getvalue()),
    scan_state="clean",
    scanned_at=now,
)
fixture["image"] = str(image.id)
target.write_text(json.dumps(fixture))
target.chmod(0o600)
print(
    "Synthetic daily appointments, queue delay, reschedule event and pre-scanned image fixture saved in isolated storage."
)
