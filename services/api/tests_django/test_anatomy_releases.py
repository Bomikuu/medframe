from uuid import uuid4

from config.errors import DomainError
from medframe_apps.anatomy.models import AnatomyChartRevision
from medframe_apps.portal.releases import preview_release, publish_release
from tests_django.anatomy_fixture import AnatomyFixture, finding


class AnatomyReleaseTests(AnatomyFixture):
    def test_explicit_selection_notes_opt_in_and_frozen_publication(self):
        value = finding()
        row = self.complete(self.start(), [value, finding()])
        chart = AnatomyChartRevision.objects.get(revision=row)
        selection = {
            "summary": "Synthetic anatomical care summary",
            "anatomy_chart_revision_id": str(chart.id),
            "anatomy_finding_keys": [value["key"]],
        }
        preview = preview_release(self.doctor, self.organization.id, row.patient_id, selection)
        shared = preview["payload"]["anatomy"]
        self.assertEqual(len(shared["findings"]), 1)
        self.assertNotIn("notes", shared["findings"][0])
        self.assertNotIn("key", shared["findings"][0])
        self.assertNotIn("encounter_id", shared["source"])
        notes = preview_release(
            self.doctor,
            self.organization.id,
            row.patient_id,
            {**selection, "anatomy_include_notes": True},
        )
        self.assertNotEqual(preview["digest"], notes["digest"])
        release = publish_release(
            self.doctor, self.organization.id, row.patient_id, selection, preview["digest"], uuid4()
        )
        self.assertEqual(release.payload["anatomy"], shared)
        old = preview_release(
            self.doctor,
            self.organization.id,
            row.patient_id,
            {"summary": "Dental only", "chart_revision_id": str(row.id)},
        )
        self.assertIsNone(old["payload"]["anatomy"])

    def test_foreign_chart_keys_empty_selection_and_note_without_chart_denied(self):
        row = self.complete(self.start(), [finding()])
        chart = AnatomyChartRevision.objects.get(revision=row)
        for selection in [
            {"anatomy_chart_revision_id": str(chart.id)},
            {"anatomy_chart_revision_id": str(chart.id), "anatomy_finding_keys": [str(uuid4())]},
            {"anatomy_chart_revision_id": str(uuid4()), "anatomy_finding_keys": [str(uuid4())]},
        ]:
            with self.subTest(selection=selection), self.assertRaises(DomainError):
                preview_release(
                    self.doctor,
                    self.organization.id,
                    row.patient_id,
                    {"summary": "Synthetic", **selection},
                )
