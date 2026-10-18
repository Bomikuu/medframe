from uuid import uuid4

from config.errors import DomainError
from medframe_apps.dental.history import compare_dental_charts, tooth_evidence
from medframe_apps.encounters import services as care
from tests_django import test_encounters
from tests_django.test_boundaries import ClinicalFixture


class DentalHistoryTests(ClinicalFixture):
    start = test_encounters.EncounterWorkflowTests.start
    content = test_encounters.EncounterWorkflowTests.content
    finalize = test_encounters.EncounterWorkflowTests.finalize

    def test_snapshot_absence_is_not_resolution_and_amendment_is_exact(self):
        encounter = self.start()
        original = self.finalize(encounter)
        encounter.refresh_from_db()
        draft = care.create_encounter_amendment(
            self.doctor, self.organization.id, encounter.id, "Synthetic correction", 1
        )
        content = original.content.copy()
        content.pop("context", None)
        content["findings"] = []
        draft = care.save_encounter_draft(
            self.doctor, self.organization.id, draft.id, content, draft.version
        )
        draft = care.transition_encounter(
            self.doctor, self.organization.id, draft.id, "completed", draft.version
        )
        amended = care.finalize_encounter(
            self.doctor, self.organization.id, draft.id, draft.version
        )
        result = compare_dental_charts(
            self.doctor, self.organization.id, encounter.patient_id, original.id, amended.id
        )
        self.assertEqual(result["differences"][0]["kind"], "absent_from_snapshot")
        self.assertEqual(result["left"]["findings"][0]["condition"], "Clinician-entered finding")
        self.assertEqual(result["summary_limit_per_tooth"], 5)
        with self.assertRaises(DomainError):
            compare_dental_charts(self.doctor, self.organization.id, uuid4(), original.id)

    def test_tooth_evidence_includes_proposed_procedure_and_exact_links(self):
        encounter = self.start()
        original = self.finalize(encounter)
        result = tooth_evidence(self.doctor, self.organization.id, encounter.patient_id, "16")
        self.assertEqual(result["items"][0]["revision_id"], str(original.id))
        self.assertEqual(result["items"][0]["procedures"][0]["status"], "proposed")
        with self.assertRaises(DomainError):
            tooth_evidence(self.doctor, self.organization.id, encounter.patient_id, "99")
