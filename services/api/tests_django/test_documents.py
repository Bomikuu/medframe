import io
from datetime import timedelta
from unittest.mock import patch

import httpx
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image

from config.errors import DomainError
from config.runtime import get_settings
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.documents import services
from medframe_apps.documents.models import DocumentVersion
from medframe_apps.documents.tasks import scan_document
from tests_django.test_boundaries import ClinicalFixture


class PrivateDocumentIntegrationTests(ClinicalFixture):
    """These tests use the actual local S3 server and ClamAV, never a clean-scan stub."""

    def setUp(self):
        self.keys = []

    def tearDown(self):
        for key in self.keys:
            default_storage.delete(key)

    def receive(self):
        patient = self.register()
        output = io.BytesIO()
        Image.new("RGB", (24, 24), "white").save(output, "PNG")
        data = output.getvalue()
        version = services.begin_document_upload(
            self.doctor,
            self.organization.id,
            patient.id,
            None,
            "clinical",
            {
                "filename": "synthetic.png",
                "content_type": "image/png",
                "size": len(data),
                "label": "Synthetic test image",
            },
        )
        self.keys.append(version.key)
        version = services.complete_document_upload(
            self.doctor,
            self.organization.id,
            version.id,
            SimpleUploadedFile("synthetic.png", data, content_type="image/png"),
        )
        self.assertEqual(version.scan_state, "pending")
        return patient, version, data

    def test_real_scan_private_download_and_revocation(self):
        patient, version, data = self.receive()
        with self.assertRaises(DomainError):
            services.authorize_document_download(self.doctor, self.organization.id, version.id)
        scan_document.run(str(version.id))
        version.refresh_from_db()
        self.assertEqual(version.scan_state, "clean")
        url = f"{get_settings().storage_endpoint}/{get_settings().storage_bucket}/{version.key}"
        self.assertEqual(httpx.get(url).status_code, 403)
        self.client.force_login(self.doctor)
        session = self.client.session
        session["mfa_verified"] = True
        session.save()
        ClinicalSession.objects.create(
            user=self.doctor,
            session_key=session.session_key,
            last_seen_at=timezone.now(),
            expires_at=timezone.now() + timedelta(hours=8),
        )
        ticket = services.authorize_document_download(self.doctor, self.organization.id, version.id)
        response = self.client.get("/documents/download", {"ticket": ticket})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), data)
        patient.access_grants.update(active=False)
        self.assertEqual(
            self.client.get("/documents/download", {"ticket": ticket}).status_code, 404
        )

    def test_unavailable_scanner_remains_quarantined(self):
        _, version, _ = self.receive()
        with (
            patch("medframe_apps.documents.tasks.scan_stream", side_effect=OSError("unavailable")),
            self.assertRaises(OSError),
        ):
            scan_document.run(str(version.id))
        self.assertEqual(DocumentVersion.objects.get(id=version.id).scan_state, "unavailable")
        with self.assertRaises(DomainError):
            services.authorize_document_download(self.doctor, self.organization.id, version.id)

    def test_signature_size_and_active_content_rejected(self):
        for data, content_type, purpose in [
            (b"not-an-image", "image/png", "clinical"),
            (b"%PDF-1.4 /JavaScript anything %%EOF", "application/pdf", "clinical"),
        ]:
            with self.assertRaises(DomainError):
                services.validate_bytes(data, content_type, purpose)
        patient = self.register()
        with self.assertRaises(DomainError):
            services.begin_document_upload(
                self.doctor,
                self.organization.id,
                patient.id,
                None,
                "clinical",
                {
                    "filename": "synthetic.pdf",
                    "content_type": "application/pdf",
                    "size": 20 * 1024 * 1024 + 1,
                    "label": "Oversized synthetic",
                },
            )

    def test_logo_does_not_grant_patient_access(self):
        patient = self.register()
        with self.assertRaises(DomainError):
            services.begin_document_upload(
                self.admin,
                self.organization.id,
                patient.id,
                None,
                "clinical",
                {
                    "filename": "synthetic.png",
                    "content_type": "image/png",
                    "size": 20,
                    "label": "Denied",
                },
            )

    def test_new_version_preserves_original_bytes_and_identifier(self):
        patient, original, data = self.receive()
        scan_document.run(str(original.id))
        next_version = services.begin_document_upload(
            self.doctor,
            self.organization.id,
            patient.id,
            None,
            "clinical",
            {
                "document_id": str(original.document_id),
                "filename": "synthetic.png",
                "content_type": "image/png",
                "size": len(data),
                "label": "Synthetic test image",
            },
        )
        self.assertEqual(next_version.document_id, original.document_id)
        self.assertEqual(next_version.version, 2)
        self.assertNotEqual(next_version.key, original.key)
        original.refresh_from_db()
        self.assertEqual(original.scan_state, "clean")
