from uuid import uuid4

from config.errors import DomainError
from medframe_apps.treatments import services
from tests_django.test_boundaries import ClinicalFixture


class TreatmentPlanTests(ClinicalFixture):
    def test_proposals_are_not_completed_evidence(self):
        patient = self.register()
        request_id = uuid4()
        data = {
            "title": "Synthetic plan",
            "items": [{"description": "Synthetic planned care", "tooth": "16"}],
        }
        plan = services.create_treatment_plan(
            self.doctor, self.organization.id, patient.id, data, request_id
        )
        self.assertEqual(
            plan.id,
            services.create_treatment_plan(
                self.doctor, self.organization.id, patient.id, data, request_id
            ).id,
        )
        item = plan.items.get()
        self.assertEqual(item.status, "proposed")
        with self.assertRaises(DomainError):
            services.update_treatment_item(
                self.doctor, self.organization.id, plan.id, item.id, "completed", 1
            )

    def test_adding_items_is_versioned_and_ordered(self):
        patient = self.register()
        plan = services.create_treatment_plan(
            self.doctor,
            self.organization.id,
            patient.id,
            {"title": "Synthetic sequence", "items": [{"description": "First step"}]},
            uuid4(),
        )
        services.add_treatment_item(
            self.doctor, self.organization.id, plan.id, {"description": "Second step"}, 1
        )
        self.assertEqual(
            list(plan.items.order_by("position").values_list("description", flat=True)),
            ["First step", "Second step"],
        )
        with self.assertRaises(DomainError):
            services.add_treatment_item(
                self.doctor, self.organization.id, plan.id, {"description": "Stale step"}, 1
            )
