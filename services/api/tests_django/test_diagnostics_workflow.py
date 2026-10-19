from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from django.db import DatabaseError, close_old_connections, transaction
from django.test import TransactionTestCase

from config.errors import DomainError
from medframe_apps.accounts.models import User
from medframe_apps.diagnostics.models import DiagnosticRequest
from medframe_apps.diagnostics.services import diagnostic_action
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.organizations.policy import seed_roles
from tests_django.diagnostics_fixture import DiagnosticFixture, staff


class DiagnosticWorkflowTests(DiagnosticFixture):
    def test_issue_immutable_and_replay(self):
        row = self.sent_request()
        with self.assertRaises(DatabaseError), transaction.atomic():
            DiagnosticRequest.objects.filter(id=row.id).update(details={"question": "changed"})
        payload = {"id": str(row.id), "expected_version": row.version}
        key = uuid4()
        first = diagnostic_action(self.center_request, self.center_org.id, "accept", payload, key)
        replay = diagnostic_action(self.center_request, self.center_org.id, "accept", payload, key)
        self.assertEqual(first.id, replay.id)
        self.assertEqual(first.events.filter(action="accept").count(), 1)

    def test_decline_reselection_recall_cancel(self):
        row = self.sent_request()
        row = self.act(row, "decline", reason="Unavailable")
        self.assertEqual(row.state, "awaiting_center")
        row = self.act(row, "assisted_select", center_id=str(self.center.id), reason="Assistance")
        row = self.act(row, "accept")
        with self.assertRaises(DomainError):
            self.act(
                row,
                "assisted_select",
                center_id=str(self.center.id),
                reason="Cannot change after acceptance",
            )
        row = self.act(row, "recall", reason="Change request")
        row = self.act(row, "cancel", reason="No longer needed")
        self.assertEqual(row.state, "cancelled")

    def test_invalid_fields_and_stale_version(self):
        with self.assertRaises(DomainError):
            diagnostic_action(
                self.clinic_request,
                self.organization.id,
                "save_draft",
                {
                    "patient_id": str(self.patient.id),
                    "expected_version": 0,
                    "modality": "dicom",
                    "test_name": "x",
                    "question": "x",
                },
                uuid4(),
            )
        row = self.sent_request()
        with self.assertRaises(DomainError):
            diagnostic_action(
                self.center_request,
                self.center_org.id,
                "accept",
                {"id": str(row.id), "expected_version": 999},
                uuid4(),
            )


class DiagnosticConcurrencyTests(TransactionTestCase):
    def setUp(self):
        seed_roles()
        self.organization = Organization.objects.create(name="Concurrent diagnostic clinic")
        self.branch = Branch.objects.create(organization=self.organization, name="Main")
        self.doctor = User.objects.create_user(
            "concurrent-diagnostic@synthetic.example", "Synthetic concurrency password 96"
        )
        self.membership = Membership.objects.create(
            user=self.doctor, organization=self.organization, branch=self.branch
        )
        self.membership.roles.add("doctor")
        DiagnosticFixture.setUp(self)

    register = DiagnosticFixture.register
    create_request = DiagnosticFixture.create_request
    act = DiagnosticFixture.act
    sent_request = DiagnosticFixture.sent_request
    performed_request = DiagnosticFixture.performed_request

    def test_cancel_submission_serialize(self):
        row = self.performed_request()
        row = self.act(row, "save_result", report="Concurrent synthetic result")
        expected = row.version

        def perform(action):
            close_old_connections()
            try:
                user = User.objects.get(
                    id=self.operator.id if action == "submit_result" else self.doctor.id
                )
                org = self.center_org.id if action == "submit_result" else self.organization.id
                diagnostic_action(
                    staff(user),
                    org,
                    action,
                    {
                        "id": str(row.id),
                        "expected_version": expected,
                        "reason": "Concurrent intent",
                    },
                    uuid4(),
                )
                return True
            except DomainError:
                return False
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(perform, ["submit_result", "cancel"]))
        self.assertEqual(sum(outcomes), 1)
        row.refresh_from_db()
        self.assertIn(row.state, {"cancelled", "results_available"})
        self.assertEqual(row.results.count(), 1 if row.state == "results_available" else 0)
