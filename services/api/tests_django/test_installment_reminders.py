from uuid import uuid4

from config.errors import DomainError
from medframe_apps.billing.invoices import invoice_action
from medframe_apps.communications.installments import reminder_obligation, validate_snapshot
from tests_django.test_installment_billing import InstallmentFixture


class InstallmentReminderTests(InstallmentFixture):
    def test_selected_obligation_stale_after_payment(self):
        row = self.issue_plan()
        obligation = row.installment.obligations.first()
        snapshot = reminder_obligation(row, obligation.id)
        self.assertEqual(snapshot["amount"], 1200000)
        row = invoice_action(
            self.request,
            self.organization.id,
            "payment",
            {"id": str(row.id), "expected_version": row.version, "amount": "12000"},
            uuid4(),
        )
        with self.assertRaises(DomainError):
            validate_snapshot(row, snapshot)

    def test_explicit_obligation_required(self):
        row = self.issue_plan()
        with self.assertRaises(DomainError):
            reminder_obligation(row, None)
