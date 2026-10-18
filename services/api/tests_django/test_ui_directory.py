from types import SimpleNamespace
from uuid import uuid4

from api_graphql.workspace import WorkspaceQuery
from config.errors import DomainError
from medframe_apps.patients import services
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.models import PatientAccessGrant
from tests_django.test_boundaries import ClinicalFixture


class DirectoryUiTests(ClinicalFixture):
    def add_patient(self, name):
        return services.register_patient(
            self.doctor,
            self.organization.id,
            RegisterPatientInput(full_name=name, branch_id=self.branch.id, request_id=uuid4()),
        )

    def test_global_order_across_pages_and_query_bound_cursor(self):
        for name in ["Zebra Synthetic", "alpha Synthetic", "Beta Synthetic"]:
            self.add_patient(name)
        rows, cursor, more, total = services.patient_directory(
            self.doctor, self.organization.id, first=2
        )
        self.assertEqual([row.full_name for row in rows], ["alpha Synthetic", "Beta Synthetic"])
        self.assertEqual((more, total), (True, 3))
        second, _, more, total = services.patient_directory(
            self.doctor, self.organization.id, first=2, after=cursor
        )
        self.assertEqual([row.full_name for row in second], ["Zebra Synthetic"])
        self.assertEqual((more, total), (False, 3))
        for changed in [{"sort": "name_desc"}, {"query": "alpha"}]:
            with self.assertRaises(DomainError):
                services.patient_directory(
                    self.doctor, self.organization.id, after=cursor, **changed
                )

    def test_scope_change_invalidates_cursor_and_rechecks_count(self):
        first = self.add_patient("A Synthetic")
        self.add_patient("B Synthetic")
        _, cursor, _, _ = services.patient_directory(self.doctor, self.organization.id, first=1)
        PatientAccessGrant.objects.filter(patient=first).update(active=False)
        with self.assertRaises(DomainError):
            services.patient_directory(self.doctor, self.organization.id, after=cursor)
        rows, _, _, total = services.patient_directory(self.doctor, self.organization.id)
        self.assertEqual((len(rows), total), (1, 1))
        with self.assertRaises(DomainError):
            services.patient_directory(self.admin, self.organization.id, after=cursor)

    def test_demographic_admin_dashboard_has_no_clinical_rows(self):
        self.add_patient("Synthetic private patient")
        payload = WorkspaceQuery().clinic_dashboard(
            SimpleNamespace(context=SimpleNamespace(user=self.admin)), self.organization.id
        )
        self.assertEqual(payload["patient_count"], 1)
        for key in ["recent_consultations", "recent_documents", "follow_ups"]:
            self.assertEqual(payload[key], [])
        self.assertEqual(payload["draft_count"], 0)
