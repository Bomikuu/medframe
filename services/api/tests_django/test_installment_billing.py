from datetime import timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from django.db import DatabaseError, transaction
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.billing.installment_actions import agreement_review
from medframe_apps.billing.invoices import invoice_action
from medframe_apps.services.cases import case_action
from tests_django.test_service_catalog import ServiceFixture


class InstallmentFixture(ServiceFixture):
    def plan_draft(self):
        service = self.service()
        case = case_action(
            self.request,
            self.organization.id,
            "create",
            {
                "service_id": service["id"],
                "service_version": 1,
                "patient_id": str(self.patient.id),
                "branch_id": str(self.branch.id),
                "expected_version": 0,
            },
            uuid4(),
        )
        today = timezone.localdate(timezone=ZoneInfo(self.organization.timezone))
        row = invoice_action(
            self.request,
            self.organization.id,
            "save",
            {
                "branch_id": str(self.branch.id),
                "patient_id": str(self.patient.id),
                "due_date": today.isoformat(),
                "expected_version": 0,
                "lines": [
                    {
                        "description": service["name"],
                        "kind": "procedure",
                        "quantity": 1,
                        "unit_amount": "60000",
                        "service_id": service["id"],
                        "service_version": 1,
                    }
                ],
                "installment": {
                    "case_id": case["id"],
                    "deposit": "12000",
                    "months": 24,
                    "deposit_due": today.isoformat(),
                    "first_due": (today + timedelta(days=31)).isoformat(),
                },
            },
            uuid4(),
        )
        return row

    def issue_plan(self):
        row = self.plan_draft()
        review = agreement_review(row)
        return invoice_action(
            self.request,
            self.organization.id,
            "issue",
            {
                "id": str(row.id),
                "expected_version": row.version,
                "agreement_confirmed": True,
                "agreement_digest": review["digest"],
            },
            uuid4(),
        )


class InstallmentBillingTests(InstallmentFixture):
    def test_review_issue_and_retry_one_agreement(self):
        row = self.plan_draft()
        with self.assertRaises(DomainError):
            invoice_action(
                self.request,
                self.organization.id,
                "issue",
                {"id": str(row.id), "expected_version": row.version},
                uuid4(),
            )
        review = agreement_review(row)
        data = {
            "id": str(row.id),
            "expected_version": row.version,
            "agreement_confirmed": True,
            "agreement_digest": review["digest"],
        }
        key = uuid4()
        issued = invoice_action(self.request, self.organization.id, "issue", data, key)
        self.assertEqual(
            issued.id, invoice_action(self.request, self.organization.id, "issue", data, key).id
        )
        self.assertEqual(issued.installment.obligations.count(), 25)
        self.assertEqual(issued.payments.count(), 0)
        with self.assertRaises(DatabaseError), transaction.atomic():
            issued.installment.obligations.update(amount=1)

    def test_changed_digest_and_past_issue_dates_denied(self):
        row = self.plan_draft()
        with self.assertRaises(DomainError):
            invoice_action(
                self.request,
                self.organization.id,
                "issue",
                {
                    "id": str(row.id),
                    "expected_version": row.version,
                    "agreement_confirmed": True,
                    "agreement_digest": "bad",
                },
                uuid4(),
            )
        future = timezone.now() + timedelta(days=60)
        from unittest.mock import patch

        with (
            patch("django.utils.timezone.now", return_value=future),
            self.assertRaises(DomainError),
        ):
            invoice_action(
                self.request,
                self.organization.id,
                "issue",
                {
                    "id": str(row.id),
                    "expected_version": row.version,
                    "agreement_confirmed": True,
                    "agreement_digest": agreement_review(row)["digest"],
                },
                uuid4(),
            )

    def test_mixed_charge_and_case_reuse_denied(self):
        row = self.plan_draft()
        terms = row.installment.terms
        source = row.lines.first().service_source
        payload = {
            "branch_id": str(self.branch.id),
            "patient_id": str(self.patient.id),
            "due_date": row.due_date.isoformat(),
            "expected_version": 0,
            "lines": [
                {
                    "description": "Synthetic braces",
                    "kind": "procedure",
                    "quantity": 1,
                    "unit_amount": "60000",
                    "service_id": str(source.service_id),
                    "service_version": 1,
                }
            ],
            "installment": terms,
        }
        with self.assertRaises(DomainError):
            invoice_action(self.request, self.organization.id, "save", payload, uuid4())
        payload["lines"].append(
            {"description": "Extra", "kind": "other", "quantity": 1, "unit_amount": "10"}
        )
        with self.assertRaises(DomainError):
            invoice_action(self.request, self.organization.id, "save", payload, uuid4())

    def test_wrong_realm_cannot_issue_and_stale_version_cannot_pay(self):
        from tests_django.test_billing import request

        row = self.issue_plan()
        with self.assertRaises(DomainError):
            invoice_action(
                request(self.admin, "patient"),
                self.organization.id,
                "payment",
                {"id": str(row.id), "expected_version": row.version, "amount": "10"},
                uuid4(),
            )
        with self.assertRaises(DomainError):
            invoice_action(
                self.request,
                self.organization.id,
                "payment",
                {"id": str(row.id), "expected_version": row.version - 1, "amount": "10"},
                uuid4(),
            )
