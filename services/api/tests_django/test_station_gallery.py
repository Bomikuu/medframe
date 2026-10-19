"""Scoped gallery facts and scanned patient-image selection, with synthetic records only."""

from datetime import datetime, timedelta
from unittest.mock import patch
from uuid import uuid4
from zoneinfo import ZoneInfo

from medframe_apps.documents.models import Document, DocumentVersion
from medframe_apps.operations.models import Appointment, OperationsEvent, QueueDay, QueueTicket
from medframe_apps.organizations.models import Branch, Role
from medframe_apps.stations import dashboard
from medframe_apps.stations.models import PatientPortrait
from tests_django.test_boundaries import ClinicalFixture
from tests_django.test_station_access import StationAccessTests
from tests_django.test_station_doctor import DoctorWorkspaceTests


class StationGalleryTests(ClinicalFixture):
    setUp = StationAccessTests.setUp
    issue = DoctorWorkspaceTests.issue
    open = DoctorWorkspaceTests.open
    post = DoctorWorkspaceTests.post

    def day(self):
        return datetime(2026, 10, 19, 10, 0, tzinfo=ZoneInfo("Asia/Manila"))

    def appointment(self, patient=None, **values):
        return Appointment.objects.create(
            organization=self.organization,
            branch=self.branch,
            patient=patient or self.patient,
            provider=self.provider,
            start=values.pop("start", self.day() - timedelta(minutes=30)),
            end=values.pop("end", self.day()),
            created_by=self.doctor,
            **values,
        )

    def ticket(self, appointment=None, **values):
        day, _ = QueueDay.objects.get_or_create(branch=self.branch, date=self.day().date())
        return QueueTicket.objects.create(
            day=day,
            patient=self.patient,
            provider=self.provider,
            number=1,
            order=1024,
            appointment=appointment,
            created_by=self.doctor,
            **values,
        )

    def feed(self, **values):
        with patch("medframe_apps.stations.dashboard.timezone") as clock:
            clock.now.return_value = self.day()
            return self.post(
                "/stations/dashboard",
                {
                    "organization_id": str(self.organization.id),
                    "branch_id": str(self.branch.id),
                    **values,
                },
            )

    def image(self, patient=None, state="clean", content_type="image/png", size=100):
        document = Document.objects.create(
            organization=self.organization,
            patient=patient or self.patient,
            uploaded_by=self.doctor,
            purpose="clinical",
            label="Synthetic patient photo",
        )
        return DocumentVersion.objects.create(
            document=document,
            uploaded_by=self.doctor,
            key=f"synthetic/{uuid4()}.png",
            filename="portrait.png",
            content_type=content_type,
            expected_size=size,
            size=size,
            scan_state=state,
        )

    def select_photo(self, image, version=0, patient=None):
        return self.post(
            "/stations/portrait",
            {
                "organization_id": str(self.organization.id),
                "patient_id": str((patient or self.patient).id),
                "action": "select",
                "image_id": str(image.id) if image else None,
                "expected_version": version,
            },
        )

    def test_today_scheduled_time_and_confirmed_late_arrival_delay_reschedule(self):
        self.assertEqual(self.open().status_code, 200)
        appointment = self.appointment(status="checked_in")
        self.ticket(
            appointment,
            encounter=self.encounter,
            delay=12,
            created_at=appointment.start + timedelta(minutes=7),
        )
        OperationsEvent.objects.create(
            branch=self.branch,
            actor=self.doctor,
            object_id=appointment.id,
            kind="appointment.rescheduled",
            before={"start": (appointment.start - timedelta(hours=1)).isoformat()},
            after={"start": appointment.start.isoformat()},
        )
        result = self.feed()
        self.assertEqual(result.status_code, 200, result.content)
        data = result.json()
        self.assertEqual(len(data["items"]), 1)
        item = data["items"][0]
        self.assertEqual(item["timing"], {"kind": "late_arrival", "minutes": 7, "delay": 12})
        self.assertEqual(item["time_kind"], "scheduled")
        self.assertTrue(item["rescheduled_at"])
        self.assertEqual(item["queue_number"], 1)
        self.assertEqual(data["date"], "2026-10-19")

    def test_past_booking_is_awaiting_arrival_not_no_show(self):
        self.assertEqual(self.open().status_code, 200)
        appointment = self.appointment()
        item = next(row for row in self.feed().json()["items"] if row["appointment_id"])
        self.assertEqual(item["status"], "booked")
        self.assertEqual(item["timing"]["kind"], "awaiting_arrival")
        self.assertEqual(item["timing"]["minutes"], 30)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, "booked")

    def test_actual_service_start_and_future_agenda(self):
        appointment = self.appointment()
        ticket = self.ticket(
            appointment,
            service_start=appointment.start + timedelta(minutes=15),
            status="in_service",
            service_user=self.doctor,
        )
        self.assertEqual(dashboard.timing(appointment, ticket, self.day())["minutes"], 15)
        self.assertEqual(dashboard.timing(appointment, ticket, self.day())["kind"], "started_late")
        self.appointment(
            start=self.day() + timedelta(days=1), end=self.day() + timedelta(days=1, minutes=30)
        )
        self.assertEqual(self.open().status_code, 200)
        data = self.feed().json()
        self.assertEqual(len([r for r in data["items"] if r["appointment_id"]]), 1)
        self.assertEqual(len(data["agenda"]), 2)

    def test_ungranted_patients_and_foreign_branch_are_not_exposed(self):
        hidden = self.register()
        self.appointment(patient=hidden)
        hidden.access_grants.update(active=False)
        self.assertEqual(self.open().status_code, 200)
        data = self.feed().json()
        self.assertNotIn(str(hidden.id), [r["patient_id"] for r in data["items"] + data["agenda"]])
        other = Branch.objects.create(organization=self.organization, name="Other")
        self.assertEqual(self.feed(branch_id=str(other.id)).status_code, 404)

    def test_operations_permission_is_not_invented(self):
        self.appointment()
        Role.objects.get(name="doctor").permissions.remove(
            *Role.objects.get(name="doctor").permissions.filter(codename="operations.read")
        )
        self.assertEqual(self.open().status_code, 200)
        data = self.feed().json()
        self.assertFalse(data["operations_available"])
        self.assertEqual(data["agenda"], [])
        self.assertTrue(all(not row["appointment_id"] for row in data["items"]))

    def test_all_records_remain_accessible_and_today_has_clinic_day_boundary(self):
        self.encounter.created_at = datetime(2026, 10, 18, 17, 0, tzinfo=ZoneInfo("UTC"))
        self.encounter.save(update_fields=["created_at"])
        self.assertEqual(self.open().status_code, 200)
        self.assertEqual(len(self.feed().json()["items"]), 1)
        self.assertEqual(len(self.feed(view="all").json()["items"]), 1)
        self.encounter.created_at -= timedelta(days=1)
        self.encounter.save(update_fields=["created_at"])
        self.assertEqual(self.feed().json()["items"], [])
        self.assertEqual(len(self.feed(view="all").json()["items"]), 1)

    def test_clean_same_patient_portrait_and_versioned_removal(self):
        image = self.image()
        self.assertEqual(self.open().status_code, 200)
        self.assertEqual(self.select_photo(image).status_code, 200)
        self.assertEqual(self.feed(view="all").json()["items"][0]["portrait_id"], str(image.id))
        self.assertEqual(self.select_photo(image).status_code, 409)
        self.assertEqual(self.select_photo(None, version=1).status_code, 200)
        self.assertIsNone(self.feed(view="all").json()["items"][0]["portrait_id"])
        self.assertEqual(PatientPortrait.objects.get().version, 2)

    def test_pending_foreign_non_image_or_oversized_portraits_rejected(self):
        other = self.register()
        images = [
            self.image(state="pending"),
            self.image(patient=other),
            self.image(content_type="application/pdf"),
        ]
        large = self.image(size=3 * 1024 * 1024)
        images.append(large)
        self.assertEqual(self.open().status_code, 200)
        for image in images:
            self.assertEqual(self.select_photo(image).status_code, 409)
        self.assertFalse(PatientPortrait.objects.exists())

    def test_portrait_grant_revocation_applies_to_next_request(self):
        image = self.image()
        self.assertEqual(self.open().status_code, 200)
        self.assertEqual(self.select_photo(image).status_code, 200)
        self.patient.access_grants.update(active=False)
        response = self.post(
            "/stations/portrait",
            {
                "organization_id": str(self.organization.id),
                "patient_id": str(self.patient.id),
            },
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.feed(view="all").json()["items"], [])

    def test_anonymous_and_legacy_exact_sessions_do_not_gain_dashboard_scope(self):
        self.assertEqual(self.feed().status_code, 401)
        code = StationAccessTests.offer(self)["code"]
        self.assertEqual(StationAccessTests.redeem(self, code).status_code, 200)
        self.assertEqual(self.feed().status_code, 403)
        self.assertEqual(self.select_photo(self.image()).status_code, 403)
