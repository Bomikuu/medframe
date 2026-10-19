from config.errors import DomainError
from medframe_apps.anatomy.history import read_anatomy_chart
from tests_django.anatomy_fixture import AnatomyFixture, finding


class AnatomyPolicyTests(AnatomyFixture):
    def test_admin_and_revoked_clinical_access_have_no_bypass(self):
        row = self.complete(self.start(), [finding()])
        with self.assertRaises(DomainError):
            read_anatomy_chart(self.admin, self.organization.id, row.patient_id)
        row.patient.access_grants.update(active=False)
        with self.assertRaises(DomainError):
            read_anatomy_chart(self.doctor, self.organization.id, row.patient_id)
