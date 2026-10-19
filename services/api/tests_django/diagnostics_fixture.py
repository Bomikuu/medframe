from types import SimpleNamespace
from uuid import uuid4

from medframe_apps.accounts.models import User
from medframe_apps.diagnostics.models import DiagnosticCenter, DiagnosticPartnership
from medframe_apps.diagnostics.services import diagnostic_action, sharing_preview
from medframe_apps.organizations.models import Membership, Organization
from medframe_apps.providers.models import ProviderProfile
from tests_django.test_boundaries import ClinicalFixture


def staff(user):
    return SimpleNamespace(user=user, session={"mfa_verified": True, "auth_realm": "staff"})


class DiagnosticFixture(ClinicalFixture):
    def setUp(self):
        self.patient = self.register()
        ProviderProfile.objects.get_or_create(membership=self.membership)
        self.clinic_request = staff(self.doctor)
        self.center_org = Organization.objects.create(name="Synthetic center")
        self.center = DiagnosticCenter.objects.create(
            organization=self.center_org, name="Synthetic center", modalities=["xray", "laboratory"]
        )
        self.operator = User.objects.create_user(
            "center@synthetic.example", "Synthetic center password 95"
        )
        member = Membership.objects.create(user=self.operator, organization=self.center_org)
        member.roles.add("diagnostic_operator")
        self.center_request = staff(self.operator)
        self.partnership = DiagnosticPartnership.objects.create(
            organization=self.organization, center=self.center
        )

    def create_request(self):
        return diagnostic_action(
            self.clinic_request,
            self.organization.id,
            "save_draft",
            {
                "patient_id": str(self.patient.id),
                "expected_version": 0,
                "modality": "xray",
                "test_name": "Synthetic panoramic X-ray",
                "question": "Synthetic clinical question",
            },
            uuid4(),
        )

    def act(self, row, action, **values):
        row.refresh_from_db()
        center = action in {
            "accept",
            "decline",
            "performed",
            "save_result",
            "submit_result",
            "start_correction",
        }
        return diagnostic_action(
            self.center_request if center else self.clinic_request,
            self.center_org.id if center else self.organization.id,
            action,
            {"id": str(row.id), "expected_version": row.version, **values},
            uuid4(),
        )

    def sent_request(self):
        row = self.create_request()
        row = self.act(row, "issue", preview_digest=sharing_preview(row)["digest"])
        return self.act(
            row,
            "assisted_select",
            center_id=str(self.center.id),
            reason="Patient requested assistance",
        )

    def performed_request(self):
        from django.utils import timezone

        row = self.act(self.sent_request(), "accept")
        return self.act(row, "performed", performed_at=timezone.now().isoformat())

    def submitted_request(self):
        row = self.performed_request()
        row = self.act(row, "save_result", report="Synthetic center report")
        return self.act(row, "submit_result")
