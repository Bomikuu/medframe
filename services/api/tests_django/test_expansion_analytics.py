from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4
from zoneinfo import ZoneInfo

from django.contrib.auth.models import Permission

from config.errors import DomainError
from medframe_apps.analytics.csv_export import render_csv, safe_cell
from medframe_apps.analytics.queries import clinic_insights
from medframe_apps.encounters.models import Encounter
from medframe_apps.operations.models import Appointment
from medframe_apps.organizations.models import Branch, Membership, Role
from medframe_apps.providers.models import ProviderProfile
from tests_django.test_boundaries import ClinicalFixture

NOW = datetime(2026, 10, 20, 0, 30, tzinfo=ZoneInfo("Asia/Manila"))


class ExpansionAnalyticsTests(ClinicalFixture):
    def setUp(self):
        self.patient = self.register()
        self.provider = ProviderProfile.objects.create(membership=self.membership)
        self.request = SimpleNamespace(
            user=self.doctor, session={"mfa_verified": True, "auth_realm": "staff"}
        )

    def report(self, **kwargs):
        with patch("django.utils.timezone.now", return_value=NOW):
            return clinic_insights(
                self.request,
                self.organization.id,
                kwargs.get("branch", self.branch.id),
                kwargs.get("days", 7),
            )

    def appointment(self, start):
        return Appointment.objects.create(
            organization=self.organization,
            branch=self.branch,
            patient=self.patient,
            provider=self.provider,
            start=start,
            end=start + timedelta(minutes=30),
            created_by=self.doctor,
        )

    def encounter(self, created_at):
        return Encounter.objects.create(
            organization=self.organization,
            branch=self.branch,
            patient=self.patient,
            provider=self.provider,
            created_by=self.doctor,
            reason="Synthetic workload",
            request_id=uuid4(),
            request_digest="test",
            created_at=created_at,
        )

    def test_clinic_midnight_and_equal_periods(self):
        self.appointment(NOW - timedelta(days=1))
        self.appointment(NOW - timedelta(days=8))
        self.appointment(NOW)
        result = self.report()
        self.assertEqual(result["current_from"], "2026-10-13")
        self.assertEqual(result["current_to"], "2026-10-19")
        self.assertEqual(result["previous_from"], "2026-10-06")
        appointments = result["operations"]["appointments"]
        self.assertEqual((appointments["current"], appointments["previous"]), (1, 1))
        self.assertEqual(appointments["distinct_current"], 1)
        self.assertEqual(len(appointments["series"]), 7)
        self.assertEqual(sum(r["count"] for r in appointments["series"]), 1)

    def test_clinical_grant_revocation_excludes_workload(self):
        self.encounter(NOW - timedelta(days=1))
        self.assertEqual(self.report()["clinical"]["encounters"]["current"], 1)
        self.patient.access_grants.update(active=False)
        self.assertEqual(self.report()["clinical"]["encounters"]["current"], 0)

    def test_administrator_has_no_clinical_section_or_clinical_csv(self):
        self.request.user = self.admin
        self.assertIsNone(self.report()["clinical"])
        with self.assertRaises(DomainError):
            render_csv(self.request, self.organization.id, self.branch.id, 7, ["clinical"])

    def test_cross_branch_and_invalid_period_denied(self):
        other = Branch.objects.create(organization=self.organization, name="Other")
        for options in ({"branch": other.id}, {"branch": uuid4()}, {"days": 8}, {"days": True}):
            with self.subTest(options=options), self.assertRaises(DomainError):
                self.report(**options)

    def test_wrong_realm_mfa_and_station_denied(self):
        for updates in (
            {"session": {"auth_realm": "patient", "mfa_verified": True}},
            {"session": {}},
            {"station_doctor": object()},
        ):
            original = vars(self.request).copy()
            self.request.__dict__.update(updates)
            with self.subTest(updates=list(updates)), self.assertRaises(DomainError):
                self.report()
            self.request.__dict__.clear()
            self.request.__dict__.update(original)

    def test_csv_contains_only_aggregates_and_escapes_text(self):
        self.encounter(NOW - timedelta(days=1))
        self.branch.name = "=Synthetic branch"
        self.branch.save()
        text = render_csv(self.request, self.organization.id, self.branch.id, 7, ["clinical"])
        self.assertIn("'=Synthetic branch", text)
        self.assertNotIn(self.patient.full_name, text)
        self.assertNotIn(self.patient.reference, text)
        self.assertNotIn("Synthetic workload", text)
        for value in ("=x", "+x", "-x", "@x", "  =x", "\tx", "\rx"):
            self.assertTrue(safe_cell(value).startswith("'"))
        self.assertEqual(safe_cell("-100.50"), "-100.50")
        with self.assertRaises(DomainError):
            render_csv(self.request, self.organization.id, self.branch.id, 7, ["unknown"])

    def test_finance_only_role_gets_no_operational_or_clinical_data(self):
        role = Role.objects.create(name="synthetic_finance_reporter")
        role.permissions.set(
            Permission.objects.filter(codename__in=["workspace.read", "billing.read"])
        )
        member = Membership.objects.get(user=self.admin, organization=self.organization)
        member.roles.set([role])
        self.request.user = self.admin
        result = self.report()
        self.assertIsNone(result["operations"])
        self.assertIsNone(result["clinical"])
        with self.assertRaises(DomainError):
            render_csv(self.request, self.organization.id, self.branch.id, 7, ["operations"])
