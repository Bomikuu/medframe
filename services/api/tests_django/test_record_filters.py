from datetime import UTC, datetime
from uuid import uuid4

from config.errors import DomainError
from medframe_apps.encounters.models import Encounter
from medframe_apps.encounters.queries import list_encounters
from medframe_apps.providers.models import ProviderProfile
from tests_django.test_boundaries import ClinicalFixture


class RecordFilterTests(ClinicalFixture):
    def test_document_presentational_metadata_stays_authorized(self):
        from medframe_apps.documents.models import Document, DocumentVersion
        from medframe_apps.documents.queries import list_documents

        self.doctor.display_name = "Synthetic clinician"
        self.doctor.save(update_fields=["display_name"])
        document = Document.objects.create(
            organization=self.organization,
            patient=self.patient,
            uploaded_by=self.doctor,
            label="Synthetic versioned document",
        )
        DocumentVersion.objects.create(
            document=document,
            uploaded_by=self.doctor,
            key=f"synthetic-metadata/{uuid4()}",
            filename="synthetic.pdf",
            content_type="application/pdf",
            expected_size=1,
            size=1,
        )
        result = list_documents(self.doctor, self.organization.id, self.patient.id)
        self.assertEqual(result["items"][0]["uploaded_by"], "Synthetic clinician")
        self.assertIn("created_at", result["items"][0])
        self.patient.access_grants.update(active=False)
        with self.assertRaises(DomainError):
            list_documents(self.doctor, self.organization.id, self.patient.id)

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

    def test_equal_timestamp_paging_and_clinic_dst_day(self):
        from datetime import UTC, datetime

        from medframe_apps.encounters.models import Encounter
        from medframe_apps.record_filters import RecordFilter, filter_dates, page_records

        encounters = [self.first, self.second]
        timestamp = datetime(2026, 3, 8, 7, tzinfo=UTC)
        Encounter.objects.filter(id__in=[item.id for item in encounters]).update(
            created_at=timestamp
        )
        query = Encounter.objects.filter(id__in=[item.id for item in encounters])
        seen = []
        after = None
        for _ in range(2):
            page = page_records(
                query,
                scope="synthetic-ties",
                after=after,
                first=1,
                serialize=lambda item: str(item.id),
            )
            seen.extend(page["items"])
            after = page["end_cursor"]
        self.assertEqual(len(set(seen)), 2)
        filtered = filter_dates(
            query, RecordFilter(date_from="2026-03-08", date_to="2026-03-08"), "America/New_York"
        )
        self.assertEqual(filtered.count(), 2)
        self.assertEqual(
            filter_dates(
                query,
                RecordFilter(date_from="2026-03-07", date_to="2026-03-07"),
                "America/New_York",
            ).count(),
            0,
        )

    def test_author_choices_are_limited_to_authorized_records(self):
        from medframe_apps.accounts.models import User
        from medframe_apps.record_authors import record_authors

        stranger = User.objects.create_user(
            "unrelated-author@example.org",
            "Synthetic unrelated password 95",
            display_name="Unrelated author",
        )
        choices = record_authors(self.doctor, self.organization.id, self.patient.id)
        self.assertIn(str(self.doctor.id), [value["value"] for value in choices])
        self.assertNotIn(str(stranger.id), [value["value"] for value in choices])
        self.patient.access_grants.update(active=False)
        with self.assertRaises(DomainError):
            record_authors(self.doctor, self.organization.id, self.patient.id)
