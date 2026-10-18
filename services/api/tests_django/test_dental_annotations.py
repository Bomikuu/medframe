from copy import deepcopy

from django.test import SimpleTestCase

from config.errors import DomainError
from medframe_apps.dental.history import compare_dental_charts
from medframe_apps.encounters import services as care
from tests_django.test_boundaries import ClinicalFixture
from tests_django import test_encounters


ANCHOR = {"asset": "dundee-permanent-v1", "point": [1.25, -2.5, 3.75]}


class AnnotationValidationTests(SimpleTestCase):
    def content(self):
        return test_encounters.EncounterWorkflowTests.content(self)

    def test_legacy_and_finite_versioned_anchor_contract(self):
        content = self.content()
        self.assertNotIn("anchor", care.validated_draft(content)["findings"][0])
        content["findings"][0]["anchor"] = ANCHOR
        self.assertEqual(care.validated_draft(content)["findings"][0]["anchor"], ANCHOR)
        for anchor in [
            {"asset": "unknown", "point": [0, 0, 0]},
            {"asset": "dundee-permanent-v1", "point": [float("nan"), 0, 0]},
            {"asset": "dundee-permanent-v1", "point": [float("inf"), 0, 0]},
            {"asset": "dundee-permanent-v1", "point": [100001, 0, 0]},
            {"asset": "dundee-permanent-v1", "point": [0, 0]},
            {"asset": "dundee-molar26-v1", "point": [0, 0, 0]},
        ]:
            with self.subTest(anchor=anchor), self.assertRaises(DomainError):
                invalid = deepcopy(content)
                invalid["findings"][0]["anchor"] = anchor
                care.validated_draft(invalid)
        content["findings"][0].update(tooth="54", surfaces=[])
        with self.assertRaises(DomainError):
            care.validated_draft(content)


class DentalAnnotationWorkflowTests(ClinicalFixture):
    start = test_encounters.EncounterWorkflowTests.start
    finalize = test_encounters.EncounterWorkflowTests.finalize

    def content(self):
        content = test_encounters.EncounterWorkflowTests.content(self)
        content["findings"][0].update(anchor=deepcopy(ANCHOR), notes="Synthetic point note")
        return content

    def test_finalized_anchor_is_preserved_and_movement_compares_as_change(self):
        encounter = self.start()
        original = self.finalize(encounter)
        self.assertEqual(original.content["findings"][0]["anchor"], ANCHOR)
        self.assertEqual(original.chart[0]["anchor"], ANCHOR)
        self.assertEqual(original.toothfinding_set.get().tooth, "16")
        amended = care.create_encounter_amendment(
            self.doctor, self.organization.id, encounter.id, "Correct note location", 1
        )
        content = deepcopy(original.content)
        content.pop("context", None)
        content["findings"][0]["anchor"]["point"][0] = 4
        amended = care.save_encounter_draft(
            self.doctor, self.organization.id, amended.id, content, amended.version
        )
        amended = care.transition_encounter(
            self.doctor, self.organization.id, amended.id, "completed", amended.version
        )
        revision = care.finalize_encounter(
            self.doctor, self.organization.id, amended.id, amended.version
        )
        comparison = compare_dental_charts(
            self.doctor, self.organization.id, encounter.patient_id, original.id, revision.id
        )
        self.assertEqual(comparison["differences"][0]["kind"], "changed")
        original.refresh_from_db()
        self.assertEqual(original.content["findings"][0]["anchor"], ANCHOR)
