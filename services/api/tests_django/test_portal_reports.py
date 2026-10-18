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
