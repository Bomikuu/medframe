from datetime import date

from django.test import SimpleTestCase

from config.errors import DomainError
from medframe_apps.billing.installment_schedule import (
    ScheduledAmount,
    build_schedule,
    project_obligations,
)


class ScheduleTests(SimpleTestCase):
    def test_braces_and_cent_rounding(self):
        rows = build_schedule(6000000, 1200000, 24, date(2026, 11, 20), date(2026, 10, 20))
        self.assertEqual(len(rows), 25)
        self.assertEqual(sum(r.amount for r in rows), 6000000)
        self.assertTrue(all(r.amount == 200000 for r in rows[1:]))
        self.assertEqual(
            [r.amount for r in build_schedule(100000, 0, 3, date(2026, 1, 31), None)],
            [33333, 33333, 33334],
        )

    def test_month_end_anchor_and_leap(self):
        for year, feb in [(2026, 28), (2028, 29)]:
            rows = build_schedule(300, 0, 3, date(year, 1, 31), None)
            self.assertEqual(
                [r.due_date for r in rows],
                [date(year, 1, 31), date(year, 2, feb), date(year, 3, 31)],
            )

    def test_bounds(self):
        for total, deposit, count in [(100, 100, 2), (1, 0, 2), (100, 0, 0), (100, 0, 61)]:
            with self.assertRaises(DomainError):
                build_schedule(total, deposit, count, date(2026, 1, 1), None)

    def test_partial_refund_and_tail_credit(self):
        rows = [
            ScheduledAmount(0, "monthly", date(2026, 1, 1), 100),
            ScheduledAmount(1, "monthly", date(2026, 2, 1), 100),
        ]
        value = project_obligations(rows, 150, 0, 0, date(2026, 1, 20), "issued")
        self.assertEqual((value["due_now"], value["future"], value["outstanding"]), (0, 50, 50))
        value = project_obligations(rows, 150, 75, 50, date(2026, 2, 2), "issued")
        self.assertEqual([r["remaining"] for r in value["rows"]], [25, 50])
        self.assertEqual(value["overdue"], 75)
        self.assertEqual(value["net_received"], 75)

    def test_credit_is_not_cash_and_void_not_due(self):
        rows = [ScheduledAmount(0, "monthly", date(2026, 1, 1), 100)]
        value = project_obligations(rows, 80, 0, 50, date(2026, 1, 1), "issued")
        self.assertEqual(value["refundable"], 30)
        self.assertEqual(value["overdue"], 0)
        self.assertEqual(project_obligations(rows, 0, 0, 0, date(2026, 2, 1), "void")["due_now"], 0)
