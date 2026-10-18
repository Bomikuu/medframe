from uuid import uuid4

from config.errors import DomainError
from medframe_apps.treatments import services
from medframe_apps.treatments.follow_ups import save_follow_up
from medframe_apps.treatments.models import TreatmentPlanRevision
from tests_django.test_boundaries import ClinicalFixture


class TreatmentWorkTests(ClinicalFixture):
    def setUp(self):
        self.patient = self.register()
        self.plan = services.create_treatment_plan(
            self.doctor,
            self.organization.id,
            self.patient.id,
            {
                "title": "Synthetic sequence",
                "items": [{"description": "First"}, {"description": "Second"}],
            },
            uuid4(),
        )

    def test_reorder_replay_and_immutable_snapshot(self):
        items = list(self.plan.items.order_by("position"))
        key = uuid4()
        result = services.reorder_plan(
            self.doctor, self.organization.id, self.plan.id, [items[1].id, items[0].id], 1, key
        )
        self.assertEqual(result.version, 2)
        replay = services.reorder_plan(
            self.doctor, self.organization.id, self.plan.id, [items[1].id, items[0].id], 1, key
        )
        self.assertEqual(replay.version, 2)
        snapshot = TreatmentPlanRevision.objects.get(plan=self.plan, version=1)
        self.assertEqual(snapshot.snapshot["items"][0]["description"], "First")
        with self.assertRaises(DomainError):
            services.reorder_plan(
                self.doctor,
                self.organization.id,
                self.plan.id,
                [items[0].id, items[0].id],
                2,
                uuid4(),
            )
        self.patient.access_grants.update(active=False)
        with self.assertRaises(DomainError):
            services.reorder_plan(
                self.doctor, self.organization.id, self.plan.id, [items[1].id, items[0].id], 1, key
            )

    def test_follow_up_date_bounds_and_conflict(self):
        item = save_follow_up(
            self.doctor,
            self.organization.id,
            self.patient.id,
            {
                "instructions": "Synthetic next review",
                "due_date": "2026-11-20",
                "plan_id": str(self.plan.id),
            },
            0,
            uuid4(),
        )
        self.assertEqual(item.due_date.isoformat(), "2026-11-20")
        self.assertEqual(
            item.revisions.get(version=1).snapshot["instructions"], "Synthetic next review"
        )
        with self.assertRaises(DomainError):
            save_follow_up(
                self.doctor,
                self.organization.id,
                self.patient.id,
                {"id": str(item.id), "instructions": "Changed"},
                0,
                uuid4(),
            )
        with self.assertRaises(DomainError):
            save_follow_up(
                self.doctor,
                self.organization.id,
                self.patient.id,
                {"instructions": "x" * 4001},
                0,
                uuid4(),
            )
