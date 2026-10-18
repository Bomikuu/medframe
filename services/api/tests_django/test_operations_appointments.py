from datetime import timedelta
from uuid import uuid4

from config.errors import DomainError
from medframe_apps.operations.appointments import (
    book_appointment,
    reschedule_appointment,
    transition_appointment,
)
from medframe_apps.operations.models import OperationsEvent
from tests_django.operations_fixture import OperationsFixture


class OperationsAppointmentTests(OperationsFixture):
    def test_replay_and_changed_payload(self):
        key = uuid4()
        row = book_appointment(self.request, self.org.id, self.booking(), key)
        self.assertEqual(
            book_appointment(self.request, self.org.id, self.booking(), key).id, row.id
        )
        with self.assertRaises(DomainError):
            book_appointment(self.request, self.org.id, self.booking(reason="Changed"), key)

    def test_failed_reschedule_keeps_original_slot(self):
        first = book_appointment(self.request, self.org.id, self.booking(), uuid4())
        second = book_appointment(
            self.request,
            self.org.id,
            self.booking(start=(self.start + timedelta(hours=1)).isoformat()),
            uuid4(),
        )
        with self.assertRaises(DomainError):
            reschedule_appointment(
                self.request,
                first.id,
                {
                    "start": second.start.isoformat(),
                    "duration": 30,
                    "expected_version": 1,
                    "reason": "Synthetic conflict",
                },
                uuid4(),
            )
        first.refresh_from_db()
        self.assertEqual(first.start, self.start)

    def test_no_show_before_start_and_stale_version_denied(self):
        row = book_appointment(self.request, self.org.id, self.booking(), uuid4())
        with self.assertRaises(DomainError):
            transition_appointment(self.request, row.id, 1, "no_show", "Not present", uuid4())
        with self.assertRaises(DomainError):
            transition_appointment(self.request, row.id, 99, "cancelled", "Synthetic", uuid4())

    def test_booking_does_not_create_clinical_record(self):
        from medframe_apps.encounters.models import Encounter

        before = Encounter.objects.count()
        row = book_appointment(self.request, self.org.id, self.booking(), uuid4())
        transition_appointment(self.request, row.id, 1, "cancelled", "Synthetic", uuid4())
        self.assertEqual(Encounter.objects.count(), before)
        self.assertTrue(
            OperationsEvent.objects.filter(object_id=row.id, kind="appointment.booked").exists()
        )
