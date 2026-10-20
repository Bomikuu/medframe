import csv
import io
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase

from config.errors import DomainError
from medframe_apps.analytics.csv_export import render_csv
from medframe_apps.analytics.periods import report_period
from medframe_apps.analytics.queries import clinic_insights
from medframe_apps.billing.analytics import financial_overview
from tests_django import test_financial_overview as finance_fixture
from tests_django.test_boundaries import ClinicalFixture

NOW = finance_fixture.NOW


class CustomPeriodTests(SimpleTestCase):
    def period(self, start, end, zone="Asia/Manila"):
        with patch("django.utils.timezone.now", return_value=NOW):
            return report_period(SimpleNamespace(timezone=zone), start_date=start, end_date=end)

    def test_inclusive_single_day_and_equal_previous_calendar_span(self):
        one = self.period("2026-10-18", "2026-10-18")
        self.assertEqual(one["days"], 1)
        self.assertEqual(one["start"], date(2026, 10, 18))
        self.assertEqual(one["end"], date(2026, 10, 19))
        self.assertEqual(one["previous"], date(2026, 10, 17))
        self.assertEqual(one["today"], date(2026, 10, 20))
        leap = self.period("2024-01-01", "2024-12-31")
        self.assertEqual(leap["days"], 366)
        self.assertEqual((leap["start"] - leap["previous"]).days, 366)

    def test_reversed_partial_oversized_today_and_invalid_dates_rejected(self):
        for start, end in [
            ("2026-10-19", "2026-10-18"),
            ("2026-10-18", None),
            (None, "2026-10-18"),
            ("2024-01-01", "2025-01-01"),
            ("2026-10-20", "2026-10-20"),
            ("2026-10-21", "2026-10-21"),
            ("2026-02-30", "2026-03-01"),
            ("20261018", "20261018"),
            ("0001-01-01", "0001-01-01"),
            (True, "2026-10-18"),
        ]:
            with self.subTest(start=start, end=end), self.assertRaises(DomainError):
                self.period(start, end)

    def test_local_day_and_dst_boundaries_do_not_use_browser_or_utc_day(self):
        self.period("2026-10-19", "2026-10-19")
        with self.assertRaises(DomainError):
            self.period("2026-10-19", "2026-10-19", "America/New_York")
        value = self.period("2026-03-08", "2026-03-08", "America/New_York")
        _, start, end = value["bounds"]
        self.assertEqual(
            (end.astimezone(ZoneInfo("UTC")) - start.astimezone(ZoneInfo("UTC"))).total_seconds(),
            23 * 3600,
        )
        self.assertEqual(value["days"], 1)


class CustomReportFlowTests(ClinicalFixture):
    invoice = finance_fixture.FinancialOverviewTests.invoice
    action = finance_fixture.FinancialOverviewTests.action

    def setUp(self):
        self.patient = self.register()
        self.request = SimpleNamespace(
            user=self.admin, session={"auth_realm": "staff", "mfa_verified": True}
        )

    def test_historical_flows_keep_current_balance_and_actual_today_due(self):
        invoice = self.invoice()
        self.action(invoice, "payment", amount="100.00", paid_date="2026-10-10")
        self.action(invoice, "payment", amount="200.00", paid_date="2026-10-18")
        self.action(invoice, "payment", amount="10.00", paid_date="2026-10-20")
        with patch("django.utils.timezone.now", return_value=NOW):
            report = financial_overview(
                self.request,
                self.organization.id,
                self.branch.id,
                start_date="2026-10-10",
                end_date="2026-10-12",
            )
            earlier = financial_overview(
                self.request,
                self.organization.id,
                self.branch.id,
                start_date="2026-09-10",
                end_date="2026-09-12",
            )
        currencies = {row["currency"]: row for row in report["currencies"]}
        current = currencies["PHP"]
        self.assertEqual(current["current"]["payments"], "100.00")
        self.assertEqual(current["outstanding"], "690.00")
        self.assertEqual(len(current["series"]), 3)
        self.assertEqual(
            (report["previous_from"], report["previous_to"]), ("2026-10-07", "2026-10-09")
        )
        old = earlier["currencies"][0]
        self.assertEqual(old["current"]["issued"], "0.00")
        self.assertEqual(old["current"]["payments"], "0.00")
        self.assertEqual(
            (old["due_now"], old["overdue"], old["future"]), ("690.00", "690.00", "0.00")
        )

    def test_aggregate_and_csv_use_identical_explicit_dates_and_preserve_scope(self):
        invoice = self.invoice()
        self.action(invoice, "payment", amount="100.01", paid_date="2026-10-10")
        with patch("django.utils.timezone.now", return_value=NOW):
            data = clinic_insights(
                self.request,
                self.organization.id,
                self.branch.id,
                start_date=date(2026, 10, 10),
                end_date=date(2026, 10, 12),
            )
            text = render_csv(
                self.request,
                self.organization.id,
                self.branch.id,
                30,
                ["operations", "finance"],
                start_date="2026-10-10",
                end_date="2026-10-12",
            )
        self.assertEqual(data["days"], 3)
        rows = list(csv.reader(io.StringIO(text)))
        self.assertIn(["Report", "current_from", "", "2026-10-10", ""], rows)
        self.assertIn(["Report", "current_to", "", "2026-10-12", ""], rows)
        self.assertIn(["finance", "payments", "current", "100.01", "PHP"], rows)
        self.assertNotIn(self.patient.full_name, text)
        self.assertNotIn(str(self.patient.id), text)
        from medframe_apps.organizations.models import Branch, Organization

        other = Organization.objects.create(name="Other synthetic report")
        branch = Branch.objects.create(organization=other, name="Other")
        with self.assertRaises(DomainError):
            financial_overview(
                self.request,
                self.organization.id,
                branch.id,
                start_date="2026-10-10",
                end_date="2026-10-12",
            )
