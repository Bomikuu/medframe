from datetime import UTC, datetime
from uuid import uuid4

from config.errors import DomainError
from medframe_apps.encounters.models import Encounter
from medframe_apps.encounters.queries import list_encounters
from medframe_apps.providers.models import ProviderProfile
from tests_django.test_boundaries import ClinicalFixture


class RecordFilterTests(ClinicalFixture):
    def setUp(self):
        from medframe_apps.encounters.services import create_encounter

        patient = self.register()
        self.patient = patient
        provider = ProviderProfile.objects.create(membership=self.membership)
        self.first = create_encounter(
            self.doctor,
            self.organization.id,
            patient.id,
            provider.id,
            self.branch.id,
            "Synthetic 100%_界",
            uuid4(),
        )
        self.second = create_encounter(
            self.doctor,
            self.organization.id,
            patient.id,
            provider.id,
            self.branch.id,
            "Synthetic other",
            uuid4(),
        )

    def records(self, filters=None, **kwargs):
        return list_encounters(
            self.doctor, self.organization.id, self.patient.id, filters, **kwargs
        )

    def test_literal_search_and_scope_bound_cursor(self):
        found = self.records({"query": "%_界"})
        self.assertEqual([value["id"] for value in found["items"]], [str(self.first.id)])
        page = self.records(first=1)
        self.assertTrue(page["has_next_page"])
        second = self.records(first=1, after=page["end_cursor"])
        self.assertNotEqual(page["items"][0]["id"], second["items"][0]["id"])
        with self.assertRaises(DomainError):
            self.records({"query": "other"}, after=page["end_cursor"])
        with self.assertRaises(DomainError):
            self.records({"status": "invented"})

    def test_clinic_date_range_and_revocation(self):
        Encounter.objects.filter(id=self.first.id).update(
            created_at=datetime(2026, 10, 17, 16, 30, tzinfo=UTC)
        )
        Encounter.objects.filter(id=self.second.id).update(
            created_at=datetime(2026, 10, 18, 16, 30, tzinfo=UTC)
        )
        page = self.records({"date_from": "2026-10-18", "date_to": "2026-10-18"})
        self.assertEqual([item["id"] for item in page["items"]], [str(self.first.id)])
        with self.assertRaises(DomainError):
            self.records({"date_from": "2026-10-19", "date_to": "2026-10-18"})
        self.patient.access_grants.update(active=False)
        with self.assertRaises(DomainError):
            self.records()
