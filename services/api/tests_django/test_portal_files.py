from datetime import timedelta
from uuid import uuid4

from django.core import signing
from django.test import RequestFactory
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.documents.tasks import scan_document
from medframe_apps.portal.models import PortalInvitation, PortalLink
from medframe_apps.portal.records import authorize_portal_download, portal_record
from medframe_apps.portal.releases import preview_release, publish_release, withdraw_release
from tests_django import test_documents
from tests_django.test_boundaries import ClinicalFixture


class PortalFileTests(ClinicalFixture):
    receive = test_documents.PrivateDocumentIntegrationTests.receive
    setUp = test_documents.PrivateDocumentIntegrationTests.setUp
    tearDown = test_documents.PrivateDocumentIntegrationTests.tearDown

    def connect(self, patient):
        invitation = PortalInvitation.objects.create(
            organization=self.organization,
            patient=patient,
            issued_by=self.doctor,
            email=self.doctor.email,
            relationship="self",
            method="in_person",
            token_hash="b" * 64,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        link = PortalLink.objects.create(
            organization=self.organization,
            patient=patient,
            user=self.doctor,
            invitation=invitation,
            relationship="self",
        )
        self.client.force_login(self.doctor)
        session = self.client.session
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
        request = RequestFactory().post("/portal/graphql")
        request.user = self.doctor
        request.session = session
        return link, request

    def test_exact_private_bytes_withdrawal_and_cross_realm_tickets(self):
        patient, version, data = self.receive()
        selection = {
            "summary": "Synthetic image release",
            "document_version_ids": [str(version.id)],
        }
        with self.assertRaises(DomainError):
            preview_release(self.doctor, self.organization.id, patient.id, selection)
        scan_document.run(str(version.id))
        preview = preview_release(self.doctor, self.organization.id, patient.id, selection)
        release = publish_release(
            self.doctor, self.organization.id, patient.id, selection, preview["digest"], uuid4()
        )
        link, request = self.connect(patient)
        ticket = authorize_portal_download(request, link.id, release.id, version.id)
        response = self.client.get("/portal/documents/download", {"ticket": ticket})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), data)
        self.assertEqual(
            self.client.get("/documents/download", {"ticket": ticket}).status_code, 403
        )
        forged = signing.dumps(
            {
                "user": str(self.doctor.id),
                "version": str(version.id),
                "organization": str(self.organization.id),
            },
            salt="document-download",
        )
        self.assertEqual(
            self.client.get("/portal/documents/download", {"ticket": forged}).status_code, 403
        )
        withdraw_release(self.doctor, self.organization.id, release.id, 1, "Synthetic withdrawal")
        self.assertEqual(
            self.client.get("/portal/documents/download", {"ticket": ticket}).status_code, 403
        )
        with self.assertRaises(DomainError):
            portal_record(request, link.id, release.id)

    def test_revoked_link_invalidates_previously_issued_ticket(self):
        patient, version, _ = self.receive()
        scan_document.run(str(version.id))
        selection = {
            "summary": "Synthetic link revocation",
            "document_version_ids": [str(version.id)],
        }
        preview = preview_release(self.doctor, self.organization.id, patient.id, selection)
        release = publish_release(
            self.doctor, self.organization.id, patient.id, selection, preview["digest"], uuid4()
        )
        link, request = self.connect(patient)
        ticket = authorize_portal_download(request, link.id, release.id, version.id)
        link.active = False
        link.save()
        self.assertEqual(
            self.client.get("/portal/documents/download", {"ticket": ticket}).status_code, 404
        )
