from config.errors import DomainError
from medframe_apps.operations.policy import (
    consultation_setup,
    require_operations,
    require_provider_scope,
)
from medframe_apps.organizations.models import Branch
from tests_django.operations_fixture import OperationsFixture, request


class OperationsPolicyTests(OperationsFixture):
    def test_reception_operates_without_clinical_role(self):
        member = require_operations(
            request(self.reception), self.org.id, "queues.manage", self.branch.id
        )
        self.assertFalse(
            member.roles.filter(permissions__codename="patients.clinical.read").exists()
        )
        self.assertEqual(require_provider_scope(member, self.provider.id), self.provider)

    def test_patient_realm_and_other_branch_denied(self):
        other = Branch.objects.create(organization=self.org, name="Other")
        for req, branch in [(request(self.admin, "patient"), self.branch), (self.request, other)]:
            with self.assertRaises(DomainError):
                require_operations(req, self.org.id, "operations.read", branch.id)

    def test_missing_profile_and_clinical_grant_are_reported_together(self):
        blockers = consultation_setup(
            self.request, self.org.id, self.patient.id, self.provider.id, self.branch.id
        )
        codes = {item["code"] for item in blockers}
        self.assertTrue(
            {"PROVIDER_REQUIRED", "CLINICAL_ROLE_REQUIRED", "PATIENT_GRANT_REQUIRED"} <= codes
        )
