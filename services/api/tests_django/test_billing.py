from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

from django.db import DatabaseError, close_old_connections, transaction
from django.test import TransactionTestCase
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import User
from medframe_apps.billing.calculations import draft_totals, invoice_totals, money
from medframe_apps.billing.inputs import LineInput
from medframe_apps.billing.invoices import invoice_action
from medframe_apps.billing.models import FinancialEvent, Invoice, InvoiceLine, Payment, Refund
from medframe_apps.billing.queries import invoice_page, portal_invoices, staff_invoice
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.organizations.policy import seed_roles
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.services import register_patient, require_patient
from medframe_apps.portal.models import PortalInvitation, PortalLink
from tests_django.test_boundaries import ClinicalFixture


def request(user, realm="staff"):
    return SimpleNamespace(user=user, session={"mfa_verified": True, "auth_realm": realm})


class BillingFixture(ClinicalFixture):
    def setUp(self):
        self.patient = self.register()
        self.request = request(self.admin)

    def draft(self, **changes):
        return {
            "branch_id": str(self.branch.id),
            "patient_id": str(self.patient.id),
            "due_date": (timezone.localdate() + timedelta(days=7)).isoformat(),
            "expected_version": 0,
            "discount_kind": "fixed",
            "discount_value": "200",
            "lines": [
                {
                    "description": "Consultation",
                    "kind": "consultation",
                    "quantity": 1,
                    "unit_amount": "500",
                },
                {
                    "description": "Procedure charge",
                    "kind": "procedure",
                    "quantity": 1,
                    "unit_amount": "1200",
                },
            ],
            **changes,
        }

    def issued(self):
        invoice = invoice_action(self.request, self.organization.id, "save", self.draft(), uuid4())
        return invoice_action(
            self.request,
            self.organization.id,
            "issue",
            {"id": str(invoice.id), "expected_version": invoice.version},
            uuid4(),
        )

    def action(self, invoice, kind, **changes):
        return invoice_action(
            self.request,
            self.organization.id,
            kind,
            {"id": str(invoice.id), "expected_version": invoice.version, **changes},
            uuid4(),
        )

    def portal(self):
        user = User.objects.create_user(
            "billing-patient@synthetic.example", "Synthetic portal password 59"
        )
        invitation = PortalInvitation.objects.create(
            organization=self.organization,
            patient=self.patient,
            issued_by=self.admin,
            email=user.email,
            relationship="self",
            method="in_person",
            token_hash=uuid4().hex,
            expires_at=timezone.now() + timedelta(days=1),
        )
        link = PortalLink.objects.create(
            organization=self.organization,
            patient=self.patient,
            user=user,
            invitation=invitation,
            relationship="self",
        )
        return request(user, "patient"), link


class BillingTests(BillingFixture):
    def test_decimal_input_and_half_up_discount(self):
        for value in ["-1", "1.001", "NaN", "1e2", "10000000", " 2", 1.2]:
            with self.assertRaises(DomainError):
                money(value)
        self.assertEqual(money("0.01"), 1)
        lines = [LineInput(description="A", unit_amount="0.05")]
        self.assertEqual(draft_totals(lines, "percent", "10")["discount"], 1)
        with self.assertRaises(DomainError):
            draft_totals(lines, "percent", "100.01")

    def test_example_partial_payment_credit_and_refund(self):
        invoice = self.issued()
        self.assertEqual(invoice.total, 150000)
        invoice = self.action(invoice, "payment", amount="500")
        self.assertEqual(invoice_totals(invoice)["outstanding"], 100000)
        payment = invoice.payments.get()
        invoice = self.action(
            invoice,
            "refund",
            payment_id=str(payment.id),
            amount="300",
            reason="Returned outside app",
        )
        self.assertEqual(invoice_totals(invoice)["outstanding"], 130000)
        invoice = self.action(invoice, "credit", amount="300", reason="Charge cancelled")
        self.assertEqual(invoice_totals(invoice)["outstanding"], 100000)
        self.assertEqual(Refund.objects.count(), 1)

    def test_replay_is_exactly_one_payment_and_payload_change_conflicts(self):
        invoice = self.issued()
        key = uuid4()
        payload = {"id": str(invoice.id), "expected_version": invoice.version, "amount": "500"}
        first = invoice_action(self.request, self.organization.id, "payment", payload, key)
        repeated = invoice_action(self.request, self.organization.id, "payment", payload, key)
        self.assertEqual(first.id, repeated.id)
        self.assertEqual(Payment.objects.count(), 1)
        with self.assertRaises(DomainError):
            invoice_action(
                self.request, self.organization.id, "payment", {**payload, "amount": "600"}, key
            )

    def test_overpayment_credit_and_refund_limits(self):
        invoice = self.issued()
        with self.assertRaises(DomainError):
            self.action(invoice, "payment", amount="1500.01")
        with self.assertRaises(DomainError):
            self.action(invoice, "credit", amount="1500.01", reason="Invalid")
        invoice = self.action(invoice, "payment", amount="100")
        with self.assertRaises(DomainError):
            self.action(
                invoice,
                "refund",
                amount="100.01",
                payment_id=str(invoice.payments.get().id),
                reason="Invalid",
            )
        with self.assertRaises(DomainError):
            self.action(invoice, "void", reason="Cannot void paid invoice")

    def test_issued_record_and_financial_history_are_immutable(self):
        invoice = self.issued()
        for callback in [
            lambda: Invoice.objects.filter(id=invoice.id).update(total=1),
            lambda: InvoiceLine.objects.filter(invoice=invoice).update(description="Changed"),
            lambda: FinancialEvent.objects.filter(invoice=invoice).delete(),
        ]:
            with self.assertRaises(DatabaseError), transaction.atomic():
                callback()
        invoice = self.action(invoice, "payment", amount="100")
        with self.assertRaises(DatabaseError), transaction.atomic():
            Payment.objects.filter(invoice=invoice).update(amount=1)
        with self.assertRaises(DatabaseError), transaction.atomic():
            Payment.objects.create(
                invoice=invoice,
                amount=150000,
                method="cash",
                paid_date=timezone.localdate(),
                actor=self.admin,
            )

    def test_staff_clinic_branch_and_clinical_isolation(self):
        invoice = self.issued()
        with self.assertRaises(DomainError):
            staff_invoice(request(self.doctor), self.organization.id, invoice.id)
        with self.assertRaises(DomainError):
            require_patient(
                self.admin, self.organization.id, self.patient.id, "patients.clinical.read"
            )
        other = Branch.objects.create(organization=self.organization, name="Other")
        Membership.objects.filter(user=self.admin).update(branch=other)
        with self.assertRaises(DomainError):
            staff_invoice(self.request, self.organization.id, invoice.id)
        with self.assertRaises(DomainError):
            staff_invoice(self.request, uuid4(), invoice.id)

    def test_reception_cannot_refund_or_credit(self):
        invoice = self.issued()
        user = User.objects.create_user(
            "billing-reception@synthetic.example", "Synthetic reception password 68"
        )
        member = Membership.objects.create(
            user=user, organization=self.organization, branch=self.branch
        )
        member.roles.add("receptionist")
        with self.assertRaises(DomainError):
            invoice_action(
                request(user),
                self.organization.id,
                "credit",
                {
                    "id": str(invoice.id),
                    "expected_version": invoice.version,
                    "amount": "100",
                    "reason": "No adjustment authority",
                },
                uuid4(),
            )

    def test_patient_projection_realm_revocation_and_draft_exclusion(self):
        portal_request, link = self.portal()
        invoice = invoice_action(self.request, self.organization.id, "save", self.draft(), uuid4())
        self.assertEqual(portal_invoices(portal_request, link.id)["items"], [])
        invoice = self.action(invoice, "issue")
        invoice = self.action(invoice, "credit", amount="10", reason="Private staff reason")
        result = portal_invoices(portal_request, link.id, invoice_id=invoice.id)
        self.assertNotIn("reason", result["events"][-1])
        self.assertNotIn("Private staff reason", str(result))
        with self.assertRaises(DomainError):
            staff_invoice(portal_request, self.organization.id, invoice.id)
        link.active = False
        link.save()
        with self.assertRaises(DomainError):
            portal_invoices(portal_request, link.id)

    def test_authoritative_filtered_summary_and_cursor_scope(self):
        invoice = self.issued()
        invoice = self.action(invoice, "payment", amount="500")
        result = invoice_page(
            self.request, self.organization.id, self.branch.id, {"status": "partial"}
        )
        self.assertEqual(result["summary"]["outstanding"], "1000.00")
        self.assertEqual(result["items"][0]["payment_status"], "partial")


class BillingConcurrencyTests(TransactionTestCase):
    def test_competing_payments_lock_the_aggregate(self):
        seed_roles()
        org = Organization.objects.create(name="Concurrent finance clinic")
        branch = Branch.objects.create(organization=org, name="Main")
        admin = User.objects.create_user(
            "concurrent-finance@synthetic.example", "Synthetic concurrency password 66"
        )
        member = Membership.objects.create(user=admin, organization=org)
        member.roles.add("clinic_administrator")
        patient = register_patient(
            admin,
            org.id,
            RegisterPatientInput(
                full_name="Synthetic Finance", branch_id=branch.id, request_id=uuid4()
            ),
        )
        draft = invoice_action(
            request(admin),
            org.id,
            "save",
            {
                "branch_id": str(branch.id),
                "patient_id": str(patient.id),
                "due_date": (timezone.localdate() + timedelta(days=1)).isoformat(),
                "expected_version": 0,
                "lines": [{"description": "Charge", "unit_amount": "1000"}],
            },
            uuid4(),
        )
        invoice = invoice_action(
            request(admin), org.id, "issue", {"id": str(draft.id), "expected_version": 1}, uuid4()
        )
        identifier, version = invoice.id, invoice.version

        def pay(_):
            close_old_connections()
            try:
                user = User.objects.get(id=admin.id)
                invoice_action(
                    request(user),
                    org.id,
                    "payment",
                    {"id": str(identifier), "expected_version": version, "amount": "700"},
                    uuid4(),
                )
                return "ok"
            except DomainError:
                return "conflict"
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(pay, range(2)))
        self.assertCountEqual(outcomes, ["ok", "conflict"])
        self.assertEqual(Payment.objects.filter(invoice_id=identifier).count(), 1)

        current = Invoice.objects.get(id=identifier)
        payment = current.payments.get()

        def refund(_):
            close_old_connections()
            try:
                user = User.objects.get(id=admin.id)
                invoice_action(
                    request(user),
                    org.id,
                    "refund",
                    {
                        "id": str(identifier),
                        "expected_version": current.version,
                        "amount": "500",
                        "payment_id": str(payment.id),
                        "reason": "Synthetic returned payment",
                    },
                    uuid4(),
                )
                return "ok"
            except DomainError:
                return "conflict"
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(refund, range(2)))
        self.assertCountEqual(outcomes, ["ok", "conflict"])
        self.assertEqual(Refund.objects.filter(payment=payment).count(), 1)
