from datetime import UTC, datetime, timedelta

from django.test import SimpleTestCase

from medframe_apps.operations.estimates import EstimateInput, estimate_queue


class OperationsEstimateTests(SimpleTestCase):
    def test_shared_resource_and_rounding(self):
        now = datetime(2026, 10, 19, 1, tzinfo=UTC)
        tickets = [
            {
                "id": str(index),
                "provider": str(index),
                "resource": "chair",
                "duration": 30,
                "delay": 0,
                "status": "waiting",
            }
            for index in range(2)
        ]
        data = EstimateInput(
            tickets, {str(index): [(now, now + timedelta(hours=3))] for index in range(2)}, []
        )
        values = estimate_queue(data, now)
        self.assertEqual(values["0"]["label"], "Up next")
        self.assertEqual((values["1"]["minimum"], values["1"]["maximum"]), (20, 40))

    def test_no_schedule_is_unavailable(self):
        now = datetime.now(UTC)
        values = estimate_queue(
            EstimateInput(
                [
                    {
                        "id": "1",
                        "provider": "p",
                        "resource": None,
                        "duration": 30,
                        "delay": 0,
                        "status": "waiting",
                    }
                ],
                {},
                [],
            ),
            now,
        )
        self.assertIsNone(values["1"]["minimum"])

    def test_break_and_recorded_delay(self):
        now = datetime(2026, 10, 19, 1, tzinfo=UTC)
        item = {
            "id": "carryover",
            "provider": "p",
            "resource": None,
            "duration": 30,
            "delay": 20,
            "status": "waiting",
        }
        values = estimate_queue(
            EstimateInput(
                [item], {"p": [(now + timedelta(hours=1), now + timedelta(hours=2))]}, []
            ),
            now,
        )
        self.assertEqual(values["carryover"]["minimum"], 45)
