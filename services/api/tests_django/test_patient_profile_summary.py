"""Native permission and aggregate facts for the reference-guided patient profile."""

from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

from django.utils import timezone

from config.errors import DomainError
from medframe_apps.billing.invoices import invoice_action
from medframe_apps.encounters import services as encounters
from medframe_apps.operations.models import Appointment
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.patients.models import PatientAccessGrant
from medframe_apps.patients.profile_summary import profile_summary
from medframe_apps.providers.models import ProviderProfile
from tests_django.test_boundaries import ClinicalFixture


class PatientProfileSummaryTests(ClinicalFixture):
    def setUp(self):
        self.patient = self.register()
        self.provider = ProviderProfile.objects.create(membership=self.membership)
        self.request = SimpleNamespace(
            user=self.doctor, session={"auth_realm": "staff", "mfa_verified": True}
        )

    def summary(self):
        return profile_summary(self.request, self.organization.id, self.patient.id)

    def appointment(self, provider=None, patient=None, status="booked", days=2):
        return Appointment.objects.create(
            organization=self.organization,
            branch=self.branch,
            patient=patient or self.patient,
            provider=provider or self.provider,
            start=timezone.now() + timedelta(days=days),
            end=timezone.now() + timedelta(days=days, minutes=30),
            created_by=self.admin,
            status=status,
        )

    def test_exact_consultation_count_is_not_limited_to_five_recent_rows(self):
        for index in range(7):
            encounters.create_encounter(
                self.doctor,
                self.organization.id,
                self.patient.id,
                self.provider.id,
                self.branch.id,
                f"Synthetic visit {index}",
                uuid4(),
            )
        clinical = self.summary()["clinical"]
        self.assertEqual(clinical["count"], 7)
        self.assertEqual(len(clinical["recent"]), 5)
        self.assertEqual(clinical["recent"][0]["reason"], "Synthetic visit 6")
        self.assertNotIn("content", clinical["recent"][0])
        self.assertIsNone(clinical["portrait_id"])

    def test_directory_administrator_gets_no_clinical_entitlement(self):
        self.request.user = self.admin
        self.assertIsNone(self.summary()["clinical"])

    def test_revoked_grant_and_wrong_tenant_are_denied(self):
        PatientAccessGrant.objects.filter(patient=self.patient, membership=self.membership).update(
            active=False
        )
        with self.assertRaises(DomainError):
            self.summary()
        other = Organization.objects.create(name="Other synthetic tenant")
        with self.assertRaises(DomainError):
            profile_summary(self.request, other.id, self.patient.id)

    def test_branch_restriction_is_preserved(self):
        branch = Branch.objects.create(organization=self.organization, name="Other branch")
        self.patient.branch = branch
        self.patient.save()
        with self.assertRaises(DomainError):
            self.summary()

    def test_upcoming_uses_native_booked_status_and_live_provider_scope(self):
        own = self.appointment()
        self.appointment(status="cancelled")
        self.appointment(days=-2)
        other_member = Membership.objects.get(user=self.admin, organization=self.organization)
        other_provider = ProviderProfile.objects.create(membership=other_member)
        self.appointment(provider=other_provider)
        self.appointment(patient=self.register())
        result = self.summary()["operations"]
        self.assertEqual(result["appointment_count"], 1)
        self.assertEqual(result["upcoming"][0]["id"], str(own.id))
        self.assertEqual(result["upcoming"][0]["status"], "booked")
        self.membership.roles.add("clinic_administrator")
        self.assertEqual(self.summary()["operations"]["appointment_count"], 2)

    def test_unauthorized_optional_sections_are_null_and_zeroes_are_real(self):
        from django.contrib.auth.models import Permission

        from medframe_apps.organizations.models import Role

        role = Role.objects.create(name="synthetic_profile_read_only")
        role.permissions.set(
            Permission.objects.filter(
                codename__in=["patients.demographics.read", "patients.clinical.read"]
            )
        )
        self.membership.roles.set([role])
        result = self.summary()
        self.assertEqual(result["clinical"]["count"], 0)
        self.assertIsNone(result["operations"])
        self.assertIsNone(result["financial"])

    def test_financial_summary_excludes_other_patients_and_draft_bills(self):
        self.request.user = self.admin

        def invoice(patient, issue):
            row = invoice_action(
                self.request,
                self.organization.id,
                "save",
                {
                    "patient_id": str(patient.id),
                    "branch_id": str(self.branch.id),
                    "due_date": (timezone.now() + timedelta(days=7)).date().isoformat(),
                    "expected_version": 0,
                    "lines": [
                        {
                            "description": "Synthetic profile service",
                            "quantity": 1,
                            "unit_amount": "1500.00",
                        }
                    ],
                },
                uuid4(),
            )
            if issue:
                invoice_action(
                    self.request,
                    self.organization.id,
                    "issue",
                    {"id": str(row.id), "expected_version": row.version},
                    uuid4(),
                )

        invoice(self.patient, True)
        invoice(self.patient, False)
        invoice(self.register(), True)
        balances = self.summary()["financial"]["balances"]
        self.assertEqual(
            balances, [{"currency": "PHP", "outstanding": "1500.00", "unpaid_count": 1}]
        )

    def test_mfa_realm_and_delegated_sessions_cannot_gain_summary_access(self):
        for session in [{"auth_realm": "staff"}, {"auth_realm": "patient", "mfa_verified": True}]:
            self.request.session = session
            with self.assertRaises(DomainError):
                self.summary()
        self.request.session = {"auth_realm": "staff", "mfa_verified": True}
        for attribute in ["station_access", "station_doctor"]:
            setattr(self.request, attribute, object())
            with self.assertRaises(DomainError) as error:
                self.summary()
            self.assertEqual(error.exception.code, "STATION_SCOPE")
            delattr(self.request, attribute)
