"""Create synthetic Station operations fixtures in the explicitly isolated review DB."""

import json
import os
import secrets
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4
from zoneinfo import ZoneInfo

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.conf import settings
from django.contrib.auth import login
from django.contrib.sessions.backends.db import SessionStore
from django.db import transaction
from django.test import RequestFactory
from django.utils import timezone
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.billing.installment_actions import agreement_review
from medframe_apps.billing.invoices import invoice_action
from medframe_apps.organizations.models import Branch
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.services import register_patient
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.services.cases import case_action
from medframe_apps.services.catalog import catalog_action
from medframe_apps.stations import pairing
from medframe_apps.stations.display import save_settings
from medframe_apps.stations.inputs import DeviceInput
from medframe_apps.stations.kiosk_visits import admit, staff_stage_action
from medframe_apps.stations.models import StationDepartment

assert (
    settings.DATABASES["default"]["NAME"]
    == "medframe_django_station_kiosk_review_20261019"
)
folder = Path.home() / ".local/share/medframe/ui-review"
base = json.loads((folder / "station-kiosk.json").read_text())
provider = ProviderProfile.objects.select_related(
    "membership__user", "membership__organization"
).get(id=base["provider"])
actor, org = provider.membership.user, provider.membership.organization
branch = Branch.objects.select_related("organization").get(id=base["branch"])
request = SimpleNamespace(
    user=actor, session={"mfa_verified": True, "auth_realm": "staff"}
)
stamp = secrets.token_hex(3)


def write(name, value):
    path = folder / name
    path.write_text(json.dumps(value))
    path.chmod(0o600)


def state(cookies):
    return {"cookies": cookies, "origins": []}


def cookie(name, value, same_site="Lax"):
    return {
        "name": name,
        "value": value,
        "domain": "localhost",
        "path": "/",
        "expires": -1,
        "httpOnly": True,
        "secure": False,
        "sameSite": same_site,
    }


r = RequestFactory().post("/auth/mfa/verify")
r.session = SessionStore()
login(r, actor, backend="django.contrib.auth.backends.ModelBackend")
r.session.update(
    {"mfa_verified": True, "auth_realm": "staff", "auth_epoch": actor.auth_epoch}
)
r.session.save()
ClinicalSession.objects.create(
    user=actor,
    session_key=r.session.session_key,
    last_seen_at=timezone.now(),
    expires_at=timezone.now() + timedelta(hours=8),
    realm="staff",
)
write(
    "station4-staff.json",
    state([cookie("medframe_django_session", r.session.session_key)]),
)

# Native pairing and physical approval; no staff cookie in the receiving TV.
created = pairing.create(
    request,
    org.id,
    DeviceInput(
        name="Synthetic TV " + stamp,
        branch_id=branch.id,
        mode="display",
        functions=["queue.display"],
    ),
)
identifier = str(created.id)
paired = pairing.manage(request, org.id, identifier, "pair", created.version)
secret, credential = pairing.redeem(request, paired["code"])
credential.device.refresh_from_db()
pairing.manage(request, org.id, identifier, "approve", credential.device.version)
write("station4-display.json", state([cookie("medframe_device", secret, "Strict")]))
setup_device = pairing.create(
    request,
    org.id,
    DeviceInput(
        name="Synthetic pairing " + stamp,
        branch_id=branch.id,
        mode="display",
        functions=["queue.display"],
    ),
)

# Unique native departments avoid modifying existing review setup.
while True:
    prefix = "S" + "".join(
        secrets.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ") for _ in range(2)
    )
    if not StationDepartment.objects.filter(branch=branch, prefix=prefix).exists():
        break
lab = StationDepartment.objects.create(
    branch=branch,
    name="Synthetic laboratory " + stamp,
    prefix=prefix,
    kind="laboratory",
    payment_timing="before",
    counter_label="Counter 4",
)
cashier = StationDepartment.objects.filter(
    branch=branch, kind="cashier", active=True
).first()
assert cashier
with transaction.atomic():
    from medframe_apps.stations.display import settings_data

    setting = settings_data(branch)
    save_settings(
        request,
        branch,
        {
            "expected_version": setting["version"],
            "announcements": ["Please have your queue ticket ready."],
        },
    )

meta = {
    "organization": str(org.id),
    "branch": str(branch.id),
    "display_device": identifier,
    "setup_device": str(setup_device.id),
    "setup_name": setup_device.name,
    "lab": str(lab.id),
    "lab_name": lab.name,
    "cashier": str(cashier.id),
    "cashier_name": cashier.name,
}
today = timezone.localdate(timezone=ZoneInfo(org.timezone))
for index, name in enumerate(["due", "future", "waiting"]):
    patient = register_patient(
        actor,
        org.id,
        RegisterPatientInput(
            full_name="Synthetic station " + name + " " + stamp,
            branch_id=branch.id,
            request_id=uuid4(),
        ),
    )
    with transaction.atomic():
        stage = admit(branch, patient, lab, actor)
        if name != "waiting":
            stage = staff_stage_action(
                request,
                stage.id,
                {"expected_version": stage.version, "target": "called"},
            )
    item = {
        "patient": str(patient.id),
        "patient_name": patient.full_name,
        "stage": str(stage.id),
        "label": stage.label,
    }
    if name != "waiting":
        service = catalog_action(
            request,
            org.id,
            "save",
            {
                "name": "Synthetic Station plan " + name + " " + stamp,
                "category": "Review",
                "description": "",
                "branch_ids": [str(branch.id)],
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
                "branch_id": str(branch.id),
                "expected_version": 0,
            },
            uuid4(),
        )
        invoice = invoice_action(
            request,
            org.id,
            "save",
            {
                "branch_id": str(branch.id),
                "patient_id": str(patient.id),
                "due_date": today.isoformat(),
                "expected_version": 0,
                "case_id": case["id"],
                "lines": [
                    {
                        "description": service["name"],
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
        if name == "future":
            invoice = invoice_action(
                request,
                org.id,
                "payment",
                {
                    "id": str(invoice.id),
                    "expected_version": invoice.version,
                    "amount": "12000",
                },
                uuid4(),
            )
        item["invoice"] = str(invoice.id)
    meta[name] = item
write("station4-review.json", meta)
print(
    "Fresh synthetic TV, pairing, queue and installment fixtures prepared in review DB only."
)
