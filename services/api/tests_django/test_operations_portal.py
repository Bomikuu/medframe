from datetime import timedelta
from uuid import uuid4

from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import User
from medframe_apps.operations.appointments import book_appointment, patient_appointment_action
from medframe_apps.operations.serializers import patient_operations
from medframe_apps.portal.models import PortalInvitation, PortalLink
from tests_django.operations_fixture import OperationsFixture, request


class OperationsPortalTests(OperationsFixture):
    def setUp(self):
        super().setUp()
        self.portal_user = User.objects.create_user(
            "operations-patient@example.test", "Synthetic portal password 97"
        )
        invitation = PortalInvitation.objects.create(
            organization=self.org,
            patient=self.patient,
            issued_by=self.admin,
            email=self.portal_user.email,
            relationship="self",
            method="in_person",
            token_hash=uuid4().hex,
            expires_at=timezone.now() + timedelta(days=1),
            consumed_at=timezone.now(),
        )
        self.link = PortalLink.objects.create(
            organization=self.org,
            patient=self.patient,
            user=self.portal_user,
            invitation=invitation,
            relationship="self",
        )
        self.portal_request = request(self.portal_user, "patient")

    def test_patient_snapshot_omits_staff_identity_fields(self):
        book_appointment(
            self.request, self.org.id, self.booking(reason="Staff operational note"), uuid4()
        )
        result = patient_operations(self.portal_request, self.link.id)
        self.assertEqual(len(result["appointments"]), 1)
        self.assertFalse(
            {"patient_id", "patient", "reason", "reference"} & result["appointments"][0].keys()
        )

    def test_revocation_denies_snapshot_and_actions(self):
        row = book_appointment(self.request, self.org.id, self.booking(), uuid4())
        self.link.active = False
        self.link.save()
        with self.assertRaises(DomainError):
            patient_operations(self.portal_request, self.link.id)
        with self.assertRaises(DomainError):
            patient_appointment_action(
                self.portal_request,
                self.link.id,
                row.id,
                {"action": "cancelled", "expected_version": 1},
                uuid4(),
            )

    def test_keep_and_cancel_are_explicit_patient_actions(self):
        row = book_appointment(self.request, self.org.id, self.booking(), uuid4())
        kept = patient_appointment_action(
            self.portal_request,
            self.link.id,
            row.id,
            {"action": "keep", "expected_version": 1},
            uuid4(),
        )
        self.assertEqual(kept.status, "booked")
        cancelled = patient_appointment_action(
            self.portal_request,
            self.link.id,
            row.id,
            {"action": "cancelled", "expected_version": kept.version},
            uuid4(),
        )
        self.assertEqual(cancelled.status, "cancelled")
