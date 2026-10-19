from uuid import uuid4

from django.db import DatabaseError, transaction

from config.errors import DomainError
from medframe_apps.anatomy.history import read_anatomy_chart
from medframe_apps.anatomy.models import AnatomyFinding, AnatomyFindingIdentity
from medframe_apps.encounters import services as care
from tests_django.anatomy_fixture import AnatomyFixture, finding


class AnatomyEncounterTests(AnatomyFixture):
    def test_anatomy_only_finalization_indexes_exact_source_and_immutable_identity(self):
        value = finding()
        row = self.complete(self.start(), [value])
        page = read_anatomy_chart(
            self.doctor, self.organization.id, row.patient_id, revision_id=row.id
        )
        self.assertEqual(page["items"][0]["key"], value["key"])
        self.assertEqual(page["items"][0]["source_revision_id"], str(row.id))
        with self.assertRaises(DatabaseError), transaction.atomic():
            AnatomyFinding.objects.filter(revision=row).update(status="resolved")
        with self.assertRaises(DatabaseError), transaction.atomic():
            AnatomyFindingIdentity.objects.filter(id=value["key"]).delete()

    def test_same_aggregate_preserves_soap_dental_and_optimistic_version(self):
        from tests_django.test_encounters import EncounterWorkflowTests

        encounter = self.start()
        content = EncounterWorkflowTests.content(self)
        content["anatomy_findings"] = [finding()]
        saved = care.save_encounter_draft(
            self.doctor, self.organization.id, encounter.id, content, encounter.version
        )
        self.assertEqual(saved.draft.content["findings"][0]["tooth"], "16")
        self.assertEqual(len(saved.draft.content["anatomy_findings"]), 1)
        legacy_content = {key: value for key, value in content.items() if key != "anatomy_findings"}
        retained = care.save_encounter_draft(
            self.doctor, self.organization.id, encounter.id, legacy_content, saved.version
        )
        self.assertEqual(len(retained.draft.content["anatomy_findings"]), 1)
        with self.assertRaises(DomainError):
            care.save_encounter_draft(
                self.doctor, self.organization.id, encounter.id, content, encounter.version
            )

    def test_foreign_keys_and_amendment_omission_are_rejected(self):
        value = finding()
        encounter = self.start()
        row = self.complete(encounter, [value])
        draft = care.create_encounter_amendment(
            self.doctor, self.organization.id, encounter.id, "Synthetic correction", 1
        )
        with self.assertRaises(DomainError):
            care.save_encounter_draft(
                self.doctor, self.organization.id, draft.id, {"anatomy_findings": []}, draft.version
            )
        # A second patient cannot adopt a reserved identity, including through a raw index row.
        other = self.register()

        other_encounter = care.create_encounter(
            self.doctor,
            self.organization.id,
            other.id,
            encounter.provider_id,
            self.branch.id,
            "Synthetic later visit",
            uuid4(),
        )
        from medframe_apps.anatomy.services import validate_anatomy_draft

        with self.assertRaises(DomainError):
            validate_anatomy_draft(self.doctor, other_encounter, [value])
        self.assertEqual(row.content["anatomy_findings"][0]["key"], value["key"])
