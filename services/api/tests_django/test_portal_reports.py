from datetime import timedelta
from uuid import uuid4

from django.test import Client, RequestFactory
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.patients.models import PatientClinicalRevision
from medframe_apps.portal.models import PortalInvitation, PortalLink
from medframe_apps.portal.records import portal_records
from medframe_apps.portal.reports import report_details, review_report, submit_report
from tests_django.test_boundaries import ClinicalFixture


class PortalReportTests(ClinicalFixture):
    def setUp(self):
        self.patient = self.register()
        invitation = PortalInvitation.objects.create(
            organization=self.organization,
            patient=self.patient,
            issued_by=self.doctor,
            email=self.doctor.email,
            relationship="self",
            method="in_person",
            token_hash="a" * 64,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        self.link = PortalLink.objects.create(
            organization=self.organization,
            patient=self.patient,
            user=self.doctor,
            invitation=invitation,
            relationship="self",
        )
        self.request = RequestFactory().post("/portal/graphql")
        self.request.user = self.doctor
        self.request.session = {"mfa_verified": True, "auth_realm": "patient"}

    def test_empty_portal_reports_replay_and_review_do_not_change_history(self):
        self.assertEqual(portal_records(self.request, self.link.id)["items"], [])
        key = uuid4()
        report = submit_report(
            self.request, self.link.id, "allergy", "Patient-reported synthetic concern", key
        )
        self.assertEqual(
            submit_report(
                self.request, self.link.id, "allergy", "Patient-reported synthetic concern", key
            ).id,
            report.id,
        )
        self.assertFalse(PatientClinicalRevision.objects.filter(patient=self.patient).exists())
        review_report(self.doctor, self.organization.id, report.id, "reviewed", 1)
        self.assertEqual(report_details(report)["state"], "reviewed")
        self.assertFalse(PatientClinicalRevision.objects.filter(patient=self.patient).exists())
        self.link.active = False
        self.link.save()
        with self.assertRaises(DomainError):
            submit_report(
                self.request, self.link.id, "allergy", "Patient-reported synthetic concern", key
            )

    def test_utf8_bounds_and_realm_inversion(self):
        with self.assertRaises(DomainError):
            submit_report(self.request, self.link.id, "other", "界" * 5000, uuid4())
        self.request.session["auth_realm"] = "staff"
        with self.assertRaises(DomainError):
            portal_records(self.request, self.link.id)
        client = Client()
        client.force_login(self.doctor)
        session = client.session
        session["mfa_verified"] = True
        session["auth_realm"] = "patient"
        session.save()
        ClinicalSession.objects.create(
            user=self.doctor,
            realm="patient",
            session_key=session.session_key,
            last_seen_at=timezone.now(),
            expires_at=timezone.now() + timedelta(hours=8),
        )
        response = client.post(
            "/portal/graphql",
            {"query": "{ currentUser { id } }"},
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertIsNotNone(response.json()["errors"])

    def test_patient_display_preferences_preserve_staff_widgets_and_private_fields(self):
        from types import SimpleNamespace

        from api_graphql.portal_schema import PortalMutation, PortalQuery
        from medframe_apps.branding.models import UserPreferences

        preferences = UserPreferences.objects.create(
            user=self.doctor,
            organization=self.organization,
            settings={"mode": "light", "density": "inherit", "sidebar_collapsed": True},
            widgets=[{"id": "recent_patients", "visible": False, "size": "wide"}],
        )
        PortalMutation().save_portal_preferences(
            SimpleNamespace(context=self.request), self.link.id, "dark", "compact", 1
        )
        preferences.refresh_from_db()
        self.assertEqual(
            preferences.widgets, [{"id": "recent_patients", "visible": False, "size": "wide"}]
        )
        self.assertTrue(preferences.settings["sidebar_collapsed"])
        workspace = PortalQuery().portal_workspace(
            SimpleNamespace(context=self.request), self.link.id
        )
        self.assertEqual(workspace["mode"], "dark")
        self.assertNotIn("widgets", workspace)
        self.assertNotIn("sidebar_collapsed", workspace)
        self.assertNotIn("avatar_id", workspace)

    def test_submission_is_immutable_and_review_history_must_match_patient(self):
        from django.db import DatabaseError, transaction

        from medframe_apps.patients.inputs import SaveClinicalHistoryInput
        from medframe_apps.patients.services import save_clinical_history

        report = submit_report(
            self.request, self.link.id, "history", "Immutable synthetic report", uuid4()
        )
        with self.assertRaises(DatabaseError), transaction.atomic():
            type(report).objects.filter(id=report.id).update(text="Changed")
        other = self.register()
        history = save_clinical_history(
            self.doctor,
            self.organization.id,
            other.id,
            SaveClinicalHistoryInput(expected_version=0, medical_history="Other synthetic patient"),
        )
        with self.assertRaises(DomainError):
            review_report(self.doctor, self.organization.id, report.id, "reviewed", 1, history.id)
