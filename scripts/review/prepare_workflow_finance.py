"""Prepare fresh synthetic Phase1/2 records only in the explicitly isolated review DB.

Requires the private station-kiosk.json synthetic base fixture. Never use against
original medframe_django; the database assertion runs before any mutation.
Sessions and metadata are written with mode 0600 outside Git.
"""

import json
import os
import secrets
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
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
from medframe_apps.encounters import services as care
from medframe_apps.organizations.models import Membership
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.services import register_patient
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.providers.specialties import save_specialties, specialty_setup

assert (
    settings.DATABASES["default"]["NAME"]
    == "medframe_django_station_kiosk_review_20261019"
)
folder = Path.home() / ".local/share/medframe/ui-review"
base = json.loads((folder / "station-kiosk.json").read_text())
provider = ProviderProfile.objects.select_related(
    "membership__user", "membership__organization"
).get(id=base["provider"])
actor = provider.membership.user
org = provider.membership.organization
assert "clinic_administrator" in provider.membership.roles.values_list(
    "name", flat=True
)
request = SimpleNamespace(
    user=actor, session={"mfa_verified": True, "auth_realm": "staff"}
)
setup = specialty_setup(request, org.id)
save_specialties(
    request,
    org.id,
    [
        c
        for c in setup["selected"]
        if c not in ["pediatrics", "dermatology", "orthopedics"]
    ],
    setup["version"],
    uuid4(),
)

# Portal identity is a new synthetic patient link; no existing credentials change.
from zoneinfo import ZoneInfo

from medframe_apps.billing.installment_actions import agreement_review
from medframe_apps.billing.invoices import invoice_action
from medframe_apps.portal.models import PortalInvitation, PortalLink
from medframe_apps.services.cases import case_action
from medframe_apps.services.catalog import catalog_action

stamp = secrets.token_hex(3)
patient = register_patient(
    actor,
    org.id,
    RegisterPatientInput(
        full_name="Synthetic workflow " + stamp,
        branch_id=base["branch"],
        request_id=uuid4(),
    ),
)
encounter = care.create_encounter(
    actor,
    org.id,
    patient.id,
    provider.id,
    patient.branch_id,
    "Synthetic Batch8 clinical review",
    uuid4(),
)
content = {
    "soap": {
        "subjective": "Preserved synthetic account",
        "objective": "Recorded synthetic observation",
        "assessment": "Clinician-authored synthetic assessment",
        "plan": "Recorded synthetic plan",
    },
    "diagnoses": [
        {
            "description": "Synthetic recorded concern",
            "certainty": "suspected",
            "code": "",
        }
    ],
}
encounter = care.save_encounter_draft(
    actor, org.id, encounter.id, content, encounter.version
)
encounter = care.transition_encounter(
    actor, org.id, encounter.id, "completed", encounter.version
)
revision = care.finalize_encounter(actor, org.id, encounter.id, encounter.version)
encounter = care.create_encounter_amendment(
    actor, org.id, encounter.id, "Synthetic unpublished amendment", revision.version
)
content["soap"]["subjective"] = "Unpublished synthetic change"
care.save_encounter_draft(actor, org.id, encounter.id, content, encounter.version)
reader = User.objects.create_user(
    "batch8-reader-" + stamp + "@synthetic.example",
    secrets.token_urlsafe(32),
    display_name="Synthetic operations reviewer",
)
m = Membership.objects.create(
    user=reader, organization=org, branch_id=patient.branch_id
)
m.roles.add("receptionist")


def storage(user, name):
    r = RequestFactory().post("/auth/mfa/verify")
    r.session = SessionStore()
    login(r, user, backend="django.contrib.auth.backends.ModelBackend")
    r.session["mfa_verified"] = True
    r.session["auth_realm"] = "staff"
    r.session["auth_epoch"] = user.auth_epoch
    r.session.save()
    ClinicalSession.objects.create(
        user=user,
        session_key=r.session.session_key,
        last_seen_at=timezone.now(),
        expires_at=timezone.now() + timedelta(hours=8),
        realm="staff",
    )
    cookie = {
        "name": "medframe_django_session",
        "value": r.session.session_key,
        "domain": "localhost",
        "path": "/",
        "expires": -1,
        "httpOnly": True,
        "secure": False,
        "sameSite": "Lax",
    }
    p = folder / name
    p.write_text(json.dumps({"cookies": [cookie], "origins": []}))
    p.chmod(0o600)


storage(actor, "improvements12-staff.json")
storage(reader, "improvements12-operations.json")
meta = {
    "organization": str(org.id),
    "branch": str(patient.branch_id),
    "patient": str(patient.id),
    "patient_name": patient.full_name,
    "encounter": str(encounter.id),
    "revision": str(revision.id),
    "actor": str(actor.id),
    "template_name": "Synthetic workflow template " + stamp,
}
meta["membership"] = str(provider.membership_id)

today = timezone.localdate(timezone=ZoneInfo(org.timezone))
stamp = secrets.token_hex(3)
scenarios = {}
for state in ["partial", "draft", "void", "no_invoice", "long_history"]:
    name = "Synthetic " + state.replace("_", " ") + " service " + stamp
    service = catalog_action(
        request,
        org.id,
        "save",
        {
            "name": name,
            "category": "Synthetic review",
            "description": "",
            "branch_ids": [base["branch"]],
            "active": True,
            "price": "60000",
            "workflow": ["Assessment", "Review"],
            "payment_mode": "monthly",
            "deposit": "12000",
            "months": 24,
            "expected_version": 0,
        },
        uuid4(),
    )
    case = case_action(
        request,
        org.id,
        "create",
        {
            "service_id": service["id"],
            "service_version": 1,
            "patient_id": str(patient.id),
            "branch_id": base["branch"],
            "expected_version": 0,
        },
        uuid4(),
    )
    invoice = None
    if state != "no_invoice":
        invoice = invoice_action(
            request,
            org.id,
            "save",
            {
                "branch_id": base["branch"],
                "patient_id": str(patient.id),
                "due_date": today.isoformat(),
                "expected_version": 0,
                "case_id": case["id"],
                "lines": [
                    {
                        "description": name,
                        "kind": "procedure",
                        "quantity": 1,
                        "unit_amount": "60000",
                        "service_id": service["id"],
                        "service_version": 1,
                        "service_case_id": case["id"],
                    }
                ],
                "installment": {
                    "case_id": case["id"],
                    "deposit": "12000",
                    "months": 24,
                    "deposit_due": today.isoformat(),
                    "first_due": (today + timedelta(days=31)).isoformat(),
                },
            },
            uuid4(),
        )
        if state != "draft":
            invoice = invoice_action(
                request,
                org.id,
                "issue",
                {
                    "id": str(invoice.id),
                    "expected_version": invoice.version,
                    "agreement_confirmed": True,
                    "agreement_digest": agreement_review(invoice)["digest"],
                },
                uuid4(),
            )
        if state in ["partial", "long_history"]:
            invoice = invoice_action(
                request,
                org.id,
                "payment",
                {
                    "id": str(invoice.id),
                    "expected_version": invoice.version,
                    "amount": "5000",
                },
                uuid4(),
            )
        elif state == "void":
            invoice = invoice_action(
                request,
                org.id,
                "void",
                {
                    "id": str(invoice.id),
                    "expected_version": invoice.version,
                    "reason": "Synthetic voided agreement",
                },
                uuid4(),
            )
    if state == "long_history":
        for _ in range(23):
            invoice = invoice_action(
                request,
                org.id,
                "payment",
                {
                    "id": str(invoice.id),
                    "expected_version": invoice.version,
                    "amount": "100",
                },
                uuid4(),
            )
    scenarios[state] = {
        "name": name,
        "case": case["id"],
        "invoice": str(invoice.id) if invoice else None,
    }

financial_reader = User.objects.create_user(
    "workflow-reader-" + stamp + "@synthetic.example",
    secrets.token_urlsafe(32),
    display_name="Synthetic workflow reviewer",
)
member = Membership.objects.create(
    user=financial_reader, organization=org, branch_id=patient.branch_id
)
member.roles.add("doctor")
storage(financial_reader, "improvements12-financial-reader.json")
portal_user = User.objects.create_user(
    "workflow-patient-" + stamp + "@synthetic.example",
    secrets.token_urlsafe(32),
    display_name="Synthetic portal reviewer",
)
invitation = PortalInvitation.objects.create(
    organization=org,
    patient=patient,
    issued_by=actor,
    email=portal_user.email,
    relationship="self",
    method="in_person",
    token_hash=uuid4().hex,
    expires_at=timezone.now() + timedelta(days=1),
)
link = PortalLink.objects.create(
    organization=org,
    patient=patient,
    user=portal_user,
    invitation=invitation,
    relationship="self",
)
r = RequestFactory().post("/auth/mfa/verify")
r.session = SessionStore()
login(r, portal_user, backend="django.contrib.auth.backends.ModelBackend")
r.session["mfa_verified"] = True
r.session["auth_realm"] = "patient"
r.session["auth_epoch"] = portal_user.auth_epoch
r.session.save()
ClinicalSession.objects.create(
    user=portal_user,
    session_key=r.session.session_key,
    last_seen_at=timezone.now(),
    expires_at=timezone.now() + timedelta(hours=8),
    realm="patient",
)
cookie = {
    "name": "medframe_django_session",
    "value": r.session.session_key,
    "domain": "localhost",
    "path": "/",
    "expires": -1,
    "httpOnly": True,
    "secure": False,
    "sameSite": "Lax",
}
p = folder / "improvements12-patient.json"
p.write_text(json.dumps({"cookies": [cookie], "origins": []}))
p.chmod(0o600)
meta.update({"link": str(link.id), "scenarios": scenarios})
p = folder / "improvements12-review.json"
p.write_text(json.dumps(meta))
p.chmod(0o600)
print(
    "Prepared fresh isolated synthetic workflow/financial records and scoped sessions; original database untouched."
)
