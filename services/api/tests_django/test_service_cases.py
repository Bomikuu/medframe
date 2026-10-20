from uuid import uuid4

from config.errors import DomainError
from medframe_apps.services.cases import case_action
from medframe_apps.services.queries import case_detail
from tests_django.test_billing import request
from tests_django.test_service_catalog import ServiceFixture


class ServiceCaseTests(ServiceFixture):
    def make_case(self):
        service = self.service()
        return case_action(
            self.request,
            self.organization.id,
            "create",
            {
                "service_id": service["id"],
                "service_version": service["version"],
                "patient_id": str(self.patient.id),
                "branch_id": str(self.branch.id),
                "expected_version": 0,
            },
            uuid4(),
        )

    def test_steps_and_cancellation_are_not_financial_or_clinical(self):
        case = self.make_case()
        with self.assertRaises(DomainError):
            case_action(
                self.request,
                self.organization.id,
                "complete",
                {"id": case["id"], "expected_version": case["version"]},
                uuid4(),
            )
        updated = case_action(
            self.request,
            self.organization.id,
            "step",
            {
                "id": case["id"],
                "expected_version": case["version"],
                "step_id": case["steps"][0]["id"],
                "status": "completed",
            },
            uuid4(),
        )
        self.assertEqual(updated["steps"][0]["status"], "completed")
        cancelled = case_action(
            self.request,
            self.organization.id,
            "cancel",
            {"id": case["id"], "expected_version": updated["version"], "reason": "Patient request"},
            uuid4(),
        )
        self.assertEqual(cancelled["status"], "cancelled")
        self.assertIsNone(cancelled["invoice_id"])

    def test_workflow_reader_cannot_get_prices_or_foreign_case(self):
        case = self.make_case()
        detail = case_detail(request(self.doctor), self.organization.id, case["id"])
        self.assertNotIn("financial", detail)
        with self.assertRaises(DomainError):
            case_detail(self.request, self.organization.id, uuid4())

    def test_skip_requires_reason_and_zero_step_completion(self):
        case = self.make_case()
        with self.assertRaises(DomainError):
            case_action(
                self.request,
                self.organization.id,
                "step",
                {
                    "id": case["id"],
                    "expected_version": 1,
                    "step_id": case["steps"][0]["id"],
                    "status": "skipped",
                },
                uuid4(),
            )

    def test_snapshot_survives_catalog_edit_and_archive(self):
        from medframe_apps.services.catalog import catalog_action
        from medframe_apps.services.models import PatientServiceCase

        case = self.make_case()
        stored = PatientServiceCase.objects.get(id=case["id"])
        source = stored.service
        catalog_action(
            self.request,
            self.organization.id,
            "save",
            {
                "id": str(source.id),
                "expected_version": source.version,
                "name": "Changed preset",
                "category": "",
                "description": "",
                "branch_ids": [str(self.branch.id)],
                "active": False,
                "price": "80000",
                "workflow": ["Different"],
                "payment_mode": "full",
                "deposit": "0",
                "months": 1,
            },
            uuid4(),
        )
        read = case_detail(self.request, self.organization.id, case["id"])
        self.assertEqual(read["financial"]["price"], "60000.00")
        self.assertEqual(read["steps"][0]["label"], "Assessment")
        with self.assertRaises(DomainError):
            case_action(
                self.request,
                self.organization.id,
                "create",
                {
                    "service_id": str(source.id),
                    "service_version": source.version + 1,
                    "patient_id": str(self.patient.id),
                    "branch_id": str(self.branch.id),
                    "expected_version": 0,
                },
                uuid4(),
            )
