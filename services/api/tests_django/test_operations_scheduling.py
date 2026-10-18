from datetime import datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from config.errors import DomainError
from medframe_apps.operations.appointments import book_appointment
from medframe_apps.operations.inputs import AvailabilityInput, Duration
from medframe_apps.operations.models import BranchResource, ProviderSchedule
from medframe_apps.operations.scheduling import (
    available_slots,
    resolve_local,
    save_resource,
    save_schedule,
)
from tests_django.operations_fixture import OperationsFixture


class OperationsSchedulingTests(OperationsFixture):
    def test_duration_and_date_bounds(self):
        self.assertEqual(Duration().duration, 30)
        for value in (5, 240):
            self.assertEqual(Duration(duration=value).duration, value)
        for value in (0, 241, 31):
            with self.assertRaises(ValueError):
                Duration(duration=value)
        with self.assertRaises(ValueError):
            AvailabilityInput(
                branch_id=self.branch.id,
                provider_id=self.provider.id,
                date_from=self.start.date(),
                date_to=self.start.date() + timedelta(days=31),
            )

    def test_dst_requires_valid_explicit_offset(self):
        zone = ZoneInfo("America/New_York")
        for value in (datetime(2026, 3, 8, 2, 30), datetime(2026, 11, 1, 1, 30)):
            with self.assertRaises(DomainError):
                resolve_local(value, zone)
        self.assertIsNotNone(
            resolve_local(datetime.fromisoformat("2026-11-01T01:30:00-04:00"), zone)
        )

    def test_adjacent_bookings_and_availability(self):
        book_appointment(self.request, self.org.id, self.booking(), uuid4())
        second = book_appointment(
            self.request,
            self.org.id,
            self.booking(start=(self.start + timedelta(minutes=30)).isoformat()),
            uuid4(),
        )
        self.assertEqual(second.start, self.start + timedelta(minutes=30))
        day = self.start.date().isoformat()
        slots = available_slots(
            self.request,
            self.org.id,
            {
                "branch_id": str(self.branch.id),
                "provider_id": str(self.provider.id),
                "date_from": day,
                "date_to": day,
                "duration": 30,
            },
        )
        self.assertNotIn(
            self.start.astimezone(ZoneInfo("UTC")).isoformat(), [row["start"] for row in slots]
        )

    def test_schedule_change_preserves_future_booking(self):
        book_appointment(self.request, self.org.id, self.booking(), uuid4())
        row = ProviderSchedule.objects.get(provider=self.provider, weekday=self.start.weekday())
        with self.assertRaises(DomainError):
            save_schedule(
                self.request,
                self.org.id,
                {
                    "id": str(row.id),
                    "branch_id": str(self.branch.id),
                    "provider_id": str(self.provider.id),
                    "expected_version": row.version,
                    "weekday": row.weekday,
                    "effective_from": str(row.effective_from),
                    "effective_to": str(row.effective_to),
                    "opens": "00:00",
                    "closes": "23:59",
                    "active": False,
                },
                uuid4(),
            )
        row.refresh_from_db()
        self.assertTrue(row.active)

    def test_resource_cannot_disable_reserved_slot(self):
        resource = BranchResource.objects.create(branch=self.branch, name="Chair")
        book_appointment(
            self.request, self.org.id, self.booking(resource_id=str(resource.id)), uuid4()
        )
        with self.assertRaises(DomainError):
            save_resource(
                self.request,
                self.org.id,
                {
                    "id": str(resource.id),
                    "branch_id": str(self.branch.id),
                    "name": resource.name,
                    "active": False,
                    "expected_version": 1,
                },
                uuid4(),
            )
