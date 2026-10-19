"""Read-only financial comparisons use native posted records and exact money."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4
from zoneinfo import ZoneInfo

from config.errors import DomainError
from medframe_apps.billing.analytics import financial_overview
from medframe_apps.billing.invoices import invoice_action
from medframe_apps.organizations.models import Branch, Membership
from tests_django.test_boundaries import ClinicalFixture

ZONE = ZoneInfo("Asia/Manila")
NOW = datetime(2026, 10, 20, 0, 30, tzinfo=ZONE)


class FinancialOverviewTests(ClinicalFixture):
    def setUp(self):
        self.patient = self.register()
        self.request = SimpleNamespace(
            user=self.admin, session={"auth_realm": "staff", "mfa_verified": True}
        )

    def invoice(self, currency="PHP", issue=True):
        with patch(
            "django.utils.timezone.now", return_value=datetime(2026, 10, 6, 12, tzinfo=ZONE)
        ):
            row = invoice_action(
                self.request,
                self.organization.id,
                "save",
                {
                    "branch_id": str(self.branch.id),
                    "patient_id": str(self.patient.id),
                    "due_date": "2026-10-10",
                    "expected_version": 0,
                    "lines": [
                        {
                            "description": "Synthetic finance report",
                            "quantity": 1,
                            "unit_amount": "1000.00",
                        }
                    ],
                },
                uuid4(),
            )
            if currency != row.currency:
                row.currency = currency
                row.save()
            if issue:
                row = invoice_action(
                    self.request,
                    self.organization.id,
                    "issue",
                    {"id": str(row.id), "expected_version": row.version},
                    uuid4(),
                )
            return row

    def action(self, row, action, **values):
        row.refresh_from_db()
        with patch("django.utils.timezone.now", return_value=NOW):
            return invoice_action(
                self.request,
                self.organization.id,
                action,
                {"id": str(row.id), "expected_version": row.version, **values},
                uuid4(),
            )

    def report(self, days=7):
        with patch("django.utils.timezone.now", return_value=NOW):
            return financial_overview(self.request, self.organization.id, self.branch.id, days)

    def test_compares_completed_clinic_days_and_keeps_exact_minor_units(self):
        invoice = self.invoice()
        self.action(invoice, "payment", amount="100.01", method="cash", paid_date="2026-10-10")
        self.action(invoice, "payment", amount="200.02", method="cash", paid_date="2026-10-18")
        self.action(
            invoice,
            "refund",
            amount="50.01",
            payment_id=str(invoice.payments.order_by("paid_date").first().id),
            reason="Synthetic refund",
            paid_date="2026-10-19",
        )
        data = self.report()
        self.assertEqual((data["current_from"], data["current_to"]), ("2026-10-13", "2026-10-19"))
        self.assertEqual((data["previous_from"], data["previous_to"]), ("2026-10-06", "2026-10-12"))
        row = data["currencies"][0]
        self.assertEqual(
            row["current"],
            {"issued": "0.00", "payments": "200.02", "refunds": "50.01", "net": "150.01"},
        )
        self.assertEqual(row["previous"]["net"], "100.01")
        self.assertEqual(row["previous"]["issued"], "1000.00")
        self.assertEqual(row["outstanding"], "749.98")
        self.assertEqual(row["overdue"], "749.98")
        self.assertEqual(row["aging"][1]["amount"], "749.98")
        self.assertEqual(len(row["series"]), 7)
        self.assertEqual(row["methods"], [{"method": "cash", "amount": "200.02"}])

    def test_today_is_excluded_from_comparison_but_updates_receivables(self):
        invoice = self.invoice()
        self.action(invoice, "payment", amount="10.00", method="cash", paid_date="2026-10-20")
        data = self.report()["currencies"][0]
        self.assertEqual(data["current"]["payments"], "0.00")
        self.assertEqual(data["outstanding"], "990.00")

    def test_native_currency_totals_combine_only_the_selected_branch_records(self):
        php = self.invoice()
        second = self.invoice()
        self.action(php, "payment", amount="100.00", method="cash", paid_date="2026-10-18")
        self.action(second, "payment", amount="20.00", method="cash", paid_date="2026-10-18")
        values = {row["currency"]: row for row in self.report()["currencies"]}
        self.assertEqual(set(values), {"PHP"})
        self.assertEqual(values["PHP"]["current"]["net"], "120.00")
        self.assertEqual(values["PHP"]["outstanding"], "1880.00")

    def test_unissued_bills_are_excluded_and_empty_period_is_zero(self):
        self.invoice(issue=False)
        row = self.report()["currencies"][0]
        self.assertEqual(row["outstanding"], "0.00")
        self.assertTrue(all(point["net"] == "0.00" for point in row["series"]))

    def test_invalid_windows_and_unpermitted_branch_are_rejected(self):
        for days in [0, 1, 8, 365, True]:
            with self.assertRaises(DomainError):
                self.report(days)
        other = Branch.objects.create(organization=self.organization, name="Unpermitted branch")
        member = Membership.objects.get(user=self.admin, organization=self.organization)
        member.branch = self.branch
        member.save()
        with self.assertRaises(DomainError):
            financial_overview(self.request, self.organization.id, other.id)

    def test_live_permission_and_staff_realm_are_required(self):
        self.request.session["auth_realm"] = "patient"
        with self.assertRaises(DomainError):
            self.report()
        self.request.session["auth_realm"] = "staff"
        Membership.objects.get(user=self.admin, organization=self.organization).roles.clear()
        with self.assertRaises(DomainError):
            self.report()

    def test_refunds_in_a_later_period_can_produce_negative_net(self):
        invoice = self.invoice()
        self.action(invoice, "payment", amount="100.00", method="cash", paid_date="2026-10-10")
        self.action(
            invoice,
            "refund",
            amount="75.00",
            payment_id=str(invoice.payments.get().id),
            reason="Synthetic refund",
            paid_date="2026-10-19",
        )
        row = self.report()["currencies"][0]
        self.assertEqual(row["current"]["net"], "-75.00")
        self.assertEqual(row["previous"]["net"], "100.00")
