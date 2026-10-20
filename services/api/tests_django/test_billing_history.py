from uuid import uuid4

from config.errors import DomainError
from medframe_apps.billing.history import (
    history_page,
    payment_confirmation,
    payment_review,
    portal_history,
    portal_invoice,
    staff_confirmation,
    staff_history,
)
from medframe_apps.billing.invoices import invoice_action
from medframe_apps.billing.queries import invoice_detail
from tests_django.test_billing import request
from tests_django.test_installment_billing import InstallmentFixture


class BillingHistoryTests(InstallmentFixture):
    def entry(self, invoice, action="payment", amount="100", **extra):
        return invoice_action(
            self.request,
            self.organization.id,
            action,
            {"id": str(invoice.id), "expected_version": invoice.version, "amount": amount, **extra},
            uuid4(),
        )

    def test_long_history_is_bounded_without_changing_totals(self):
        invoice = self.issue_plan()
        for _ in range(25):
            invoice = self.entry(invoice)
        detail = invoice_detail(invoice)
        self.assertEqual(len(detail["payments"]), 20)
        self.assertEqual(len(detail["events"]), 20)
        self.assertEqual((detail["paid"], detail["outstanding"]), ("2500.00", "57500.00"))
        page = staff_history(
            self.request,
            self.organization.id,
            invoice.id,
            "payments",
            detail["payments_page"]["end_cursor"],
        )
        self.assertEqual(len(page["items"]), 5)
        self.assertFalse(page["has_next_page"])
        self.assertFalse({x["id"] for x in detail["payments"]} & {x["id"] for x in page["items"]})
        events = history_page(invoice, "events", detail["events_page"]["end_cursor"])
        self.assertEqual(len(events["items"]), 6)

    def test_cursor_cannot_cross_invoice_kind_realm_or_version(self):
        invoice = self.issue_plan()
        for _ in range(21):
            invoice = self.entry(invoice)
        cursor = history_page(invoice, "payments")["end_cursor"]
        other = self.issue_plan()
        for target, kind, portal in [
            (other, "payments", False),
            (invoice, "events", False),
            (invoice, "payments", True),
        ]:
            with self.assertRaises(DomainError):
                history_page(target, kind, cursor, portal=portal)
        invoice = self.entry(invoice)
        with self.assertRaises(DomainError):
            history_page(invoice, "payments", cursor)

    def test_refund_lookup_reaches_payment_outside_display_page(self):
        invoice = self.issue_plan()
        invoice = self.entry(invoice, amount="5000")
        original = invoice.payments.first()
        for _ in range(21):
            invoice = self.entry(invoice)
        detail = invoice_detail(invoice)
        self.assertNotIn(str(original.id), [p["id"] for p in detail["payments"]])
        first = staff_history(self.request, self.organization.id, invoice.id, "refundable")
        older = staff_history(
            self.request, self.organization.id, invoice.id, "refundable", first["end_cursor"]
        )
        self.assertIn(str(original.id), [p["id"] for p in older["items"]])
        invoice = self.entry(
            invoice, "refund", "5000", payment_id=str(original.id), reason="Synthetic return"
        )
        self.assertEqual(invoice_detail(invoice)["due"]["due_now"], "9900.00")
        confirmation = payment_confirmation(invoice, original.id)
        self.assertEqual((confirmation["refunded"], confirmation["retained"]), ("5000.00", "0.00"))

    def test_payment_review_uses_native_coverage_without_writing(self):
        invoice = self.issue_plan()
        result = payment_review(
            self.request, self.organization.id, invoice.id, invoice.version, "14000"
        )
        self.assertEqual(result["after"]["due_now"], "0.00")
        self.assertEqual(result["after"]["outstanding"], "46000.00")
        self.assertEqual(result["after"]["next_due"]["remaining"], "2000.00")
        self.assertEqual(invoice.payments.count(), 0)
        invoice = self.entry(invoice, amount="14000")
        self.assertEqual(invoice_detail(invoice)["due"], result["after"])

    def test_review_rejects_stale_draft_zero_or_overpayment(self):
        draft = self.plan_draft()
        with self.assertRaises(DomainError):
            payment_review(self.request, self.organization.id, draft.id, draft.version, "1")
        invoice = self.issue_plan()
        for version, amount in [(0, "1"), (invoice.version, "0"), (invoice.version, "60001")]:
            with self.assertRaises(DomainError):
                payment_review(self.request, self.organization.id, invoice.id, version, amount)

    def test_confirmation_requires_existing_invoice_payment_and_current_permission(self):
        invoice = self.entry(self.issue_plan(), amount="5000")
        payment = invoice.payments.first()
        result = staff_confirmation(self.request, self.organization.id, invoice.id, payment.id)
        self.assertEqual(
            (result["payment"]["amount"], result["outstanding"]), ("5000.00", "55000.00")
        )
        for req, org, target, entry in [
            (request(self.doctor), self.organization.id, invoice.id, payment.id),
            (self.request, uuid4(), invoice.id, payment.id),
            (self.request, self.organization.id, invoice.id, uuid4()),
        ]:
            with self.assertRaises(DomainError):
                staff_confirmation(req, org, target, entry)
        with self.assertRaises(DomainError):
            staff_history(request(self.doctor), self.organization.id, invoice.id, "payments")

    def test_portal_history_and_confirmation_are_redacted_and_link_scoped(self):
        invoice = self.entry(self.issue_plan())
        req, link = self.portal()
        page = portal_history(req, link.id, invoice.id, "events")
        self.assertTrue(page["items"])
        self.assertTrue(all("actor" not in x and "reason" not in x for x in page["items"]))
        current = portal_invoice(req, link.id, invoice.id)
        result = payment_confirmation(current, invoice.payments.first().id, portal=True)
        self.assertNotIn("reference", result["payment"])
        with self.assertRaises(DomainError):
            portal_history(req, link.id, invoice.id, "refundable")
        with self.assertRaises(DomainError):
            portal_invoice(req, link.id, self.plan_draft().id)
        link.active = False
        link.save(update_fields=["active"])
        with self.assertRaises(DomainError):
            portal_history(req, link.id, invoice.id, "events")
