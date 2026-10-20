from uuid import uuid4

from medframe_apps.billing.analytics import financial_overview
from medframe_apps.billing.installment_projection import invoice_due_projection, serialize_due
from medframe_apps.billing.invoices import invoice_action
from medframe_apps.billing.queries import invoice_detail
from tests_django.test_installment_billing import InstallmentFixture


class InstallmentReportingTests(InstallmentFixture):
    def test_deposit_due_future_and_partial_payment(self):
        row = self.issue_plan()
        due = invoice_due_projection(row)
        self.assertEqual(
            (due["due_now"], due["future"], due["outstanding"]), (1200000, 4800000, 6000000)
        )
        row = invoice_action(
            self.request,
            self.organization.id,
            "payment",
            {"id": str(row.id), "expected_version": row.version, "amount": "5000"},
            uuid4(),
        )
        due = invoice_due_projection(row)
        self.assertEqual(due["due_now"], 700000)
        result = financial_overview(self.request, self.organization.id, self.branch.id)
        self.assertEqual(result["currencies"][0]["overdue"], "0.00")
        self.assertEqual(result["currencies"][0]["due_now"], "7000.00")
        self.assertEqual(invoice_detail(row, portal=True)["due"]["future"], "48000.00")

    def test_refund_credit_reconcile(self):
        row = self.issue_plan()
        row = invoice_action(
            self.request,
            self.organization.id,
            "payment",
            {"id": str(row.id), "expected_version": row.version, "amount": "14000"},
            uuid4(),
        )
        payment = row.payments.first()
        row = invoice_action(
            self.request,
            self.organization.id,
            "refund",
            {
                "id": str(row.id),
                "expected_version": row.version,
                "amount": "3000",
                "payment_id": str(payment.id),
                "reason": "Synthetic correction",
            },
            uuid4(),
        )
        row = invoice_action(
            self.request,
            self.organization.id,
            "credit",
            {
                "id": str(row.id),
                "expected_version": row.version,
                "amount": "4000",
                "reason": "Synthetic adjustment",
            },
            uuid4(),
        )
        due = serialize_due(invoice_due_projection(row))
        self.assertEqual((due["due_now"], due["outstanding"]), ("1000.00", "45000.00"))

    def test_future_principal_not_overdue_and_private_portal_fields_omitted(self):
        from datetime import timedelta

        from django.utils import timezone

        row = self.issue_plan()
        from zoneinfo import ZoneInfo

        due = invoice_due_projection(
            row,
            timezone.localdate(timezone=ZoneInfo(self.organization.timezone)) + timedelta(days=1),
        )
        self.assertEqual(due["overdue"], 1200000)
        self.assertEqual(due["future"], 4800000)
        detail = invoice_detail(row, portal=True)
        self.assertNotIn("source", detail["installment_plan"])
        self.assertTrue(all("actor" not in event for event in detail["events"]))
