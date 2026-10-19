from uuid import uuid4

from config.errors import DomainError
from medframe_apps.diagnostics.partnerships import partnership_action
from medframe_apps.diagnostics.policy import get_request, request_scope
from medframe_apps.organizations.models import Membership
from tests_django.diagnostics_fixture import DiagnosticFixture, staff


class DiagnosticScopeTests(DiagnosticFixture):
    def test_center_sees_only_assigned_issued_request(self):
        draft = self.create_request()
        with self.assertRaises(DomainError):
            get_request(self.center_request, self.center_org.id, draft.id, context="center")
        row = self.sent_request()
        self.assertEqual(
            get_request(self.center_request, self.center_org.id, row.id, context="center").id,
            row.id,
        )
        with self.assertRaises(DomainError):
            get_request(staff(self.admin), self.organization.id, row.id, context="clinic")
        with self.assertRaises(DomainError):
            request_scope(self.center_request, self.organization.id, "clinic")

    def test_suspension_withdrawal_and_membership_revocation(self):
        row = self.sent_request()
        partnership_action(
            staff(self.admin),
            self.organization.id,
            "suspend",
            {
                "center_id": str(self.center.id),
                "expected_version": 1,
                "reason": "Synthetic suspension",
            },
            uuid4(),
        )
        with self.assertRaises(DomainError):
            get_request(self.center_request, self.center_org.id, row.id, context="center")
        partnership_action(
            staff(self.admin),
            self.organization.id,
            "authorize",
            {
                "center_id": str(self.center.id),
                "expected_version": 2,
                "reason": "Synthetic resumption",
            },
            uuid4(),
        )
        row = self.act(row, "withdraw_sharing", reason="Stop sharing")
        with self.assertRaises(DomainError):
            get_request(self.center_request, self.center_org.id, row.id, context="center")
        self.act(row, "resume_sharing", reason="Resume selected request")
        Membership.objects.filter(user=self.operator).update(active=False)
        with self.assertRaises(DomainError):
            get_request(self.center_request, self.center_org.id, row.id, context="center")

    def test_patient_revocation_and_invalid_context(self):
        self.patient.access_grants.update(active=False)
        with self.assertRaises(DomainError):
            self.create_request()
        with self.assertRaises(DomainError):
            request_scope(self.clinic_request, self.organization.id, "invalid")
