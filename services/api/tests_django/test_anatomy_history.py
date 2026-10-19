from uuid import uuid4

from config.errors import DomainError
from medframe_apps.anatomy.history import compare_anatomy_charts, read_anatomy_chart
from medframe_apps.encounters import services as care
from tests_django.anatomy_fixture import AnatomyFixture, finding


class AnatomyHistoryTests(AnatomyFixture):
    def test_amendment_exact_history_status_and_comparison(self):
        encounter = self.start()
        value = finding()
        original = self.complete(encounter, [value])
        amended = care.create_encounter_amendment(
            self.doctor, self.organization.id, encounter.id, "Synthetic amendment", 1
        )
        current = {**value, "status": "resolved", "source_revision_id": str(original.id)}
        revision = self.complete(amended, [current])
        exact = read_anatomy_chart(
            self.doctor, self.organization.id, encounter.patient_id, revision_id=original.id
        )
        self.assertEqual(exact["items"][0]["status"], "active")
        result = compare_anatomy_charts(
            self.doctor, self.organization.id, encounter.patient_id, original.id, revision.id
        )
        self.assertEqual(result["items"][0]["kind"], "changed")
        self.assertEqual(result["items"][0]["right"]["status"], "resolved")
        with self.assertRaises(DomainError):
            read_anatomy_chart(
                self.doctor, self.organization.id, encounter.patient_id, revision_id=uuid4()
            )

    def test_exact_chart_paging_is_scope_bound_and_empty_is_not_resolution(self):
        encounter = self.start()
        original = self.complete(encounter, [finding(), finding()])
        page = read_anatomy_chart(
            self.doctor,
            self.organization.id,
            encounter.patient_id,
            revision_id=original.id,
            first=1,
        )
        self.assertTrue(page["has_next_page"])
        self.assertEqual(len(page["items"]), 1)
        next_page = read_anatomy_chart(
            self.doctor,
            self.organization.id,
            encounter.patient_id,
            revision_id=original.id,
            after=page["end_cursor"],
            first=1,
        )
        self.assertNotEqual(page["items"][0]["key"], next_page["items"][0]["key"])
        with self.assertRaises(DomainError):
            read_anatomy_chart(
                self.doctor,
                self.organization.id,
                encounter.patient_id,
                after=page["end_cursor"],
                first=1,
            )

    def test_stale_carry_forward_rejected_across_visits(self):
        from medframe_apps.anatomy.services import validate_anatomy_draft

        encounter = self.start()
        value = finding()
        first = self.complete(encounter, [value])

        other = care.create_encounter(
            self.doctor,
            self.organization.id,
            encounter.patient_id,
            encounter.provider_id,
            self.branch.id,
            "Synthetic later visit",
            uuid4(),
        )
        with self.assertRaises(DomainError):
            validate_anatomy_draft(self.doctor, other, [value])
        validate_anatomy_draft(self.doctor, other, [{**value, "source_revision_id": str(first.id)}])
