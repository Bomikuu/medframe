"""Real PostgreSQL acceptance tests for the Django migration boundary."""

from uuid import uuid4

from django.test import TestCase

from config.errors import DomainError
from medframe_apps.accounts.hashers import encode_legacy_password
from medframe_apps.accounts.models import User
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.organizations.policy import seed_roles
from medframe_apps.patients import services
from medframe_apps.patients.models import PatientClinicalRevision


class ClinicalFixture(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_roles()
        cls.organization = Organization.objects.create(name="Synthetic clinic")
        cls.branch = Branch.objects.create(organization=cls.organization, name="Main")
        cls.doctor = User.objects.create_user(
            "doctor@synthetic.example", "Synthetic test password 91"
        )
        cls.admin = User.objects.create_superuser(
            "admin@synthetic.example", "Synthetic test password 92"
        )
        cls.membership = Membership.objects.create(
            user=cls.doctor, organization=cls.organization, branch=cls.branch
        )
        cls.membership.roles.add("doctor")
        admin_membership = Membership.objects.create(user=cls.admin, organization=cls.organization)
        admin_membership.roles.add("clinic_administrator")

    def register(self):
        from medframe_apps.patients.inputs import RegisterPatientInput

        return services.register_patient(
            self.doctor,
            self.organization.id,
            RegisterPatientInput(
                full_name="Synthetic Patient",
                branch_id=self.branch.id,
                request_id=uuid4(),
            ),
        )


class ClinicalBoundaryTests(ClinicalFixture):
    def test_registration_replay_and_changed_request(self):
        from medframe_apps.patients.inputs import RegisterPatientInput

        data = RegisterPatientInput(
            full_name="Synthetic Patient", branch_id=self.branch.id, request_id=uuid4()
        )
        first = services.register_patient(self.doctor, self.organization.id, data)
        self.assertEqual(
            first.id, services.register_patient(self.doctor, self.organization.id, data).id
        )
        with self.assertRaises(DomainError) as error:
            services.register_patient(
                self.doctor, self.organization.id, data.model_copy(update={"full_name": "Changed"})
            )
        self.assertEqual(error.exception.code, "CONFLICT")

    def test_superuser_has_no_patient_clinical_bypass(self):
        patient = self.register()
        with self.assertRaises(DomainError):
            services.require_patient(
                self.admin, self.organization.id, patient.id, "patients.clinical.read"
            )

    def test_revocation_applies_to_next_read(self):
        patient = self.register()
        patient.access_grants.update(active=False)
        with self.assertRaises(DomainError):
            services.require_patient(
                self.doctor, self.organization.id, patient.id, "patients.clinical.read"
            )

    def test_immutable_history_and_conflicts(self):
        from medframe_apps.patients.inputs import SaveClinicalHistoryInput

        patient = self.register()
        data = SaveClinicalHistoryInput(
            expected_version=0, medical_history="Patient-reported history"
        )
        revision = services.save_clinical_history(
            self.doctor, self.organization.id, patient.id, data
        )
        with self.assertRaises(DomainError):
            services.save_clinical_history(self.doctor, self.organization.id, patient.id, data)
        self.assertEqual(
            PatientClinicalRevision.objects.get(id=revision.id).medical_history,
            data.medical_history,
        )

    def test_legacy_password_upgrades_without_reset(self):
        from pwdlib import PasswordHash

        raw = "Synthetic legacy password 93"
        user = User.objects.create(
            email="legacy@synthetic.example",
            password=encode_legacy_password(PasswordHash.recommended().hash(raw)),
        )
        self.assertFalse(user.check_password("incorrect"))
        self.assertTrue(user.check_password(raw))
        user.refresh_from_db()
        self.assertTrue(user.password.startswith("argon2$"))
