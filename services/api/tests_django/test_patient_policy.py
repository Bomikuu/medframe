from datetime import date, timedelta
from unittest.mock import patch
from uuid import uuid4

from django.db import DatabaseError, transaction

from config.errors import DomainError
from medframe_apps.auditing.models import AuditEvent
from medframe_apps.organizations.models import Branch, Organization
from medframe_apps.patients import services
from medframe_apps.patients.inputs import (
    RegisterPatientInput,
    SaveClinicalHistoryInput,
    UpdateDemographicsInput,
)
from medframe_apps.patients.models import Patient, PatientAccessGrant
from tests_django.test_boundaries import ClinicalFixture


class PatientPolicyTests(ClinicalFixture):
    def test_branch_and_foreign_clinic_scope_precedes_counts(self):
        patient = self.register()
        other = Organization.objects.create(name="Other synthetic clinic")
        branch = Branch.objects.create(organization=other, name="Other")
        with self.assertRaises(DomainError):
            services.search_patients(self.doctor, other.id)
        with self.assertRaises(DatabaseError), transaction.atomic():
            Patient.objects.filter(id=patient.id).update(branch=branch)

    def test_role_removal_revokes_granted_search_and_recent(self):
        self.register()
        self.membership.roles.clear()
        with self.assertRaises(DomainError):
            services.search_patients(self.doctor, self.organization.id)
        with self.assertRaises(DomainError):
            services.recent_patients(self.doctor, self.organization.id)

    def test_future_birth_date_and_failed_audit_roll_back(self):
        for kwargs in [{"date_of_birth": date.today() + timedelta(days=2)}, {}]:
            data = RegisterPatientInput(
                full_name="Synthetic rollback",
                branch_id=self.branch.id,
                request_id=uuid4(),
                **kwargs,
            )
            with (
                self.assertRaises((DomainError, RuntimeError)),
                patch(
                    "medframe_apps.patients.services.audit",
                    side_effect=RuntimeError("synthetic audit outage"),
                ),
            ):
                services.register_patient(self.doctor, self.organization.id, data)
        self.assertFalse(Patient.objects.exists())

    def test_literal_wildcards_and_pagination_bounds(self):
        self.register()
        rows, _, count = services.search_patients(self.doctor, self.organization.id, "%")
        self.assertEqual((rows, count), ([], 0))
        for size in [0, 51]:
            with self.assertRaises(DomainError):
                services.search_patients(self.doctor, self.organization.id, first=size)

    def test_demographics_conflict_preserves_version(self):
        patient = self.register()
        data = UpdateDemographicsInput(full_name="Synthetic changed", expected_version=1)
        services.update_demographics(self.doctor, self.organization.id, patient.id, data)
        with self.assertRaises(DomainError):
            services.update_demographics(self.doctor, self.organization.id, patient.id, data)
        patient.refresh_from_db()
        self.assertEqual(patient.version, 2)

    def test_admin_timeline_excludes_clinical_events(self):
        patient = self.register()
        services.save_clinical_history(
            self.doctor,
            self.organization.id,
            patient.id,
            SaveClinicalHistoryInput(
                expected_version=0, medical_history="Synthetic private history"
            ),
        )
        items, _, _ = services.patient_timeline(self.admin, self.organization.id, patient.id)
        self.assertNotIn("clinical.updated", [item.action for item in items])

    def test_grant_revocation_is_attributed_and_remains_effective(self):
        patient = self.register()
        services.set_patient_access(
            self.admin, self.organization.id, patient.id, self.membership.id, False
        )
        grant = PatientAccessGrant.objects.get(patient=patient)
        self.assertEqual(grant.revoked_by_id, self.admin.id)
        self.assertEqual(services.search_patients(self.doctor, self.organization.id)[2], 0)

    def test_audit_and_history_are_append_only(self):
        self.register()
        with self.assertRaises(DatabaseError), transaction.atomic():
            AuditEvent.objects.update(action="rewritten")
