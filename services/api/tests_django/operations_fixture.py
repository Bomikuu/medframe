from datetime import datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4
from zoneinfo import ZoneInfo

from django.test import TestCase

from medframe_apps.accounts.models import User
from medframe_apps.operations.models import ProviderSchedule
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.organizations.policy import seed_roles
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.services import register_patient
from medframe_apps.providers.models import ProviderProfile


def request(user, realm="staff"):
    return SimpleNamespace(user=user, session={"mfa_verified": True, "auth_realm": realm})


def seed():
    seed_roles()
    org = Organization.objects.create(name="Synthetic operations clinic")
    branch = Branch.objects.create(organization=org, name="Main")
    admin = User.objects.create_user(
        "operations-admin@example.test", "Synthetic operations password 97"
    )
    doctor = User.objects.create_user(
        "operations-doctor@example.test", "Synthetic clinician password 98"
    )
    reception = User.objects.create_user(
        "operations-reception@example.test", "Synthetic reception password 99"
    )
    for user, role in [
        (admin, "clinic_administrator"),
        (doctor, "dentist"),
        (reception, "receptionist"),
    ]:
        member = Membership.objects.create(organization=org, branch=branch, user=user)
        member.roles.add(role)
    member = Membership.objects.get(user=doctor)
    provider = ProviderProfile.objects.create(membership=member, specialty="dentistry")
    patient = register_patient(
        doctor,
        org.id,
        RegisterPatientInput(
            full_name="Synthetic operations patient", branch_id=branch.id, request_id=uuid4()
        ),
    )
    now = datetime.now(ZoneInfo("Asia/Manila"))
    for weekday in range(7):
        ProviderSchedule.objects.create(
            provider=provider,
            branch=branch,
            weekday=weekday,
            effective_from=now.date() - timedelta(days=1),
            effective_to=now.date() + timedelta(days=365),
            opens="00:00",
            closes="23:59",
        )
    return SimpleNamespace(
        org=org,
        branch=branch,
        admin=admin,
        doctor=doctor,
        reception=reception,
        provider=provider,
        patient=patient,
        member=member,
        start=(now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0),
    )


class OperationsFixture(TestCase):
    def setUp(self):
        self.fixture = seed()
        for key, value in vars(self.fixture).items():
            setattr(self, key, value)
        self.request = request(self.admin)

    def booking(self, **changes):
        return {
            "branch_id": str(self.branch.id),
            "provider_id": str(self.provider.id),
            "patient_id": str(self.patient.id),
            "start": self.start.isoformat(),
            "duration": 30,
            **changes,
        }
