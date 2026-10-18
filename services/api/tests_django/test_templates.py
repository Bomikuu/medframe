from copy import deepcopy
from uuid import uuid4

from config.errors import DomainError
from medframe_apps.encounters.templates import apply_template, save_template
from tests_django import test_encounters
from tests_django.test_boundaries import ClinicalFixture


class TemplateTests(ClinicalFixture):
    start = test_encounters.EncounterWorkflowTests.start
    content = test_encounters.EncounterWorkflowTests.content
    finalize = test_encounters.EncounterWorkflowTests.finalize

    def test_prompts_never_become_recorded_facts(self):
        encounter = self.start()
        original = deepcopy(encounter.draft.content)
        template = save_template(
            self.doctor,
            self.organization.id,
            {"name": "Synthetic guidance", "prompts": {"subjective": "Ask about concerns"}},
            0,
            uuid4(),
        )
        revision = template.revisions.get(version=1)
        encounter = apply_template(
            self.doctor, self.organization.id, encounter.id, revision.id, 1, uuid4()
        )
        self.assertEqual(encounter.draft.content, original)
        self.assertEqual(encounter.draft.template_revision_id, revision.id)
        self.assertEqual(encounter.version, 2)
        self.finalize(encounter)
        self.assertEqual(
            encounter.revisions.get().content["context"]["template_revision_id"], str(revision.id)
        )
        template.active = False
        template.save()
        with self.assertRaises(DomainError):
            apply_template(
                self.doctor,
                self.organization.id,
                encounter.id,
                revision.id,
                encounter.version,
                uuid4(),
            )

    def test_invalid_clinical_defaults_are_rejected(self):
        with self.assertRaises(DomainError):
            save_template(
                self.doctor,
                self.organization.id,
                {"name": "Not allowed", "diagnoses": [{"description": "Invented"}]},
                0,
                uuid4(),
            )
        with self.assertRaises(DomainError):
            save_template(
                self.doctor,
                self.organization.id,
                {"name": "Not allowed", "prompts": {"objective": "x" * 1001}},
                0,
                uuid4(),
            )
