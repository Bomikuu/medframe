from uuid import uuid4

from config.errors import DomainError
from medframe_apps.portal.releases import preview_release, publish_release, withdraw_release
from tests_django import test_encounters
from tests_django.test_boundaries import ClinicalFixture


class PortalReleaseTests(ClinicalFixture):
    start = test_encounters.EncounterWorkflowTests.start
    content = test_encounters.EncounterWorkflowTests.content
    finalize = test_encounters.EncounterWorkflowTests.finalize

    def test_explicit_sections_frozen_publication_and_replay_after_withdrawal(self):
        encounter = self.finalize(self.start())
        revision = encounter
        selection = {
            "summary": "Synthetic release",
            "encounters": [{"revision_id": str(revision.id), "soap_sections": ["plan"]}],
        }
        preview = preview_release(
            self.doctor, self.organization.id, encounter.patient_id, selection
        )
        self.assertEqual(set(preview["payload"]["encounters"][0]["soap"]), {"plan"})
        self.assertNotIn("context", str(preview["payload"]))
        key = uuid4()
        release = publish_release(
            self.doctor,
            self.organization.id,
            encounter.patient_id,
            selection,
            preview["digest"],
            key,
        )
        self.assertEqual(release.sequence, 1)
        withdraw_release(self.doctor, self.organization.id, release.id, 1, "Synthetic withdrawal")
        replay = publish_release(
            self.doctor,
            self.organization.id,
            encounter.patient_id,
            selection,
            preview["digest"],
            key,
        )
        self.assertEqual(replay.id, release.id)
        self.assertEqual(replay.events.latest("version").state, "withdrawn")
        with self.assertRaises(DomainError):
            publish_release(
                self.admin,
                self.organization.id,
                encounter.patient_id,
                selection,
                preview["digest"],
                uuid4(),
            )

    def test_empty_wrong_patient_and_preview_tampering_are_denied(self):
        encounter = self.finalize(self.start())
        with self.assertRaises(DomainError):
            preview_release(
                self.doctor, self.organization.id, encounter.patient_id, {"summary": "No sources"}
            )
        selection = {"summary": "Selected", "chart_revision_id": str(encounter.id)}
        with self.assertRaises(DomainError):
            preview_release(self.doctor, self.organization.id, self.register().id, selection)
        with self.assertRaises(DomainError):
            publish_release(
                self.doctor,
                self.organization.id,
                encounter.patient_id,
                selection,
                "invalid",
                uuid4(),
            )
