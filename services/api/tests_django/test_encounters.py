from uuid import uuid4

from django.db import DatabaseError, transaction

from config.errors import DomainError
from medframe_apps.encounters import services as care
from medframe_apps.encounters.models import EncounterRevision
from medframe_apps.providers.models import ProviderProfile
from tests_django.test_boundaries import ClinicalFixture


class EncounterWorkflowTests(ClinicalFixture):
    def start(self):
        patient = self.register()
        provider = ProviderProfile.objects.create(membership=self.membership)
        return care.create_encounter(
            self.doctor,
            self.organization.id,
            patient.id,
            provider.id,
            self.branch.id,
            "Patient-reported concern",
            uuid4(),
        )

    def content(self):
        return {
            "soap": {
                "subjective": "Patient reports discomfort",
                "objective": "Recorded observation",
                "assessment": "Requires review",
                "plan": "Discuss options",
            },
            "diagnoses": [
                {"description": "Clinician-entered concern", "certainty": "suspected", "code": ""}
            ],
            "findings": [
                {
                    "key": str(uuid4()),
                    "tooth": "16",
                    "surfaces": ["occlusal"],
                    "condition": "Clinician-entered finding",
                    "severity": "moderate",
                    "status": "active",
                    "notes": "",
                }
            ],
            "procedures": [
                {
                    "description": "Discussed treatment",
                    "status": "proposed",
                    "tooth": "16",
                    "surfaces": [],
                    "notes": "",
                }
            ],
        }

    def finalize(self, encounter):
        encounter = care.save_encounter_draft(
            self.doctor, self.organization.id, encounter.id, self.content(), encounter.version
        )
        encounter = care.transition_encounter(
            self.doctor, self.organization.id, encounter.id, "in_progress", encounter.version
        )
        encounter = care.transition_encounter(
            self.doctor, self.organization.id, encounter.id, "completed", encounter.version
        )
        return care.finalize_encounter(
            self.doctor, self.organization.id, encounter.id, encounter.version
        )

    def test_walk_in_draft_does_not_change_final_chart(self):
        encounter = self.start()
        care.save_encounter_draft(
            self.doctor, self.organization.id, encounter.id, self.content(), encounter.version
        )
        self.assertEqual(
            care.read_dental_chart(self.doctor, self.organization.id, encounter.patient_id), []
        )
        self.assertEqual(
            len(
                care.read_dental_chart(
                    self.doctor,
                    self.organization.id,
                    encounter.patient_id,
                    encounter_id=encounter.id,
                )
            ),
            1,
        )

    def test_finalization_creates_immutable_exact_revision(self):
        encounter = self.start()
        revision = self.finalize(encounter)
        self.assertEqual(revision.version, 1)
        self.assertEqual(revision.chart[0]["tooth"], "16")
        with self.assertRaises(DatabaseError), transaction.atomic():
            EncounterRevision.objects.filter(id=revision.id).update(content={})

    def test_stale_autosave_cannot_cross_finalization(self):
        encounter = self.start()
        self.finalize(encounter)
        with self.assertRaises(DomainError):
            care.save_encounter_draft(
                self.doctor, self.organization.id, encounter.id, self.content(), 1
            )

    def test_amendment_preserves_original_and_requires_reason(self):
        encounter = self.start()
        original = self.finalize(encounter)
        with self.assertRaises(DomainError):
            care.create_encounter_amendment(self.doctor, self.organization.id, encounter.id, "", 1)
        amended = care.create_encounter_amendment(
            self.doctor, self.organization.id, encounter.id, "Correct recorded observation", 1
        )
        content = self.content()
        content["soap"]["objective"] = "Corrected observation"
        amended = care.save_encounter_draft(
            self.doctor, self.organization.id, encounter.id, content, amended.version
        )
        amended = care.transition_encounter(
            self.doctor, self.organization.id, encounter.id, "completed", amended.version
        )
        revision = care.finalize_encounter(
            self.doctor, self.organization.id, encounter.id, amended.version
        )
        original.refresh_from_db()
        self.assertEqual(original.content["soap"]["objective"], "Recorded observation")
        self.assertEqual(revision.content["soap"]["objective"], "Corrected observation")
        self.assertEqual(revision.amendment_reason, "Correct recorded observation")

    def test_cross_patient_chart_revision_rejected(self):
        encounter = self.start()
        revision = self.finalize(encounter)
        other = self.register()
        with self.assertRaises(DomainError):
            care.read_dental_chart(
                self.doctor, self.organization.id, other.id, revision_id=revision.id
            )
