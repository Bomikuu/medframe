import io
from unittest.mock import patch
from uuid import uuid4

from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from config.errors import DomainError
from medframe_apps.diagnostics.files import (
    authorize_diagnostic_download,
    begin_result_upload,
    complete_result_upload,
    redeem_ticket,
)
from medframe_apps.documents.services import require_document
from medframe_apps.documents.tasks import scan_document
from tests_django.diagnostics_fixture import DiagnosticFixture


class DiagnosticFileTests(DiagnosticFixture):
    def test_real_private_scan_submission_and_ticket_revocation(self):
        row = self.performed_request()
        output = io.BytesIO()
        Image.new("RGB", (40, 28), "white").save(output, "PNG")
        data = output.getvalue()
        version = begin_result_upload(
            self.center_request,
            self.center_org.id,
            row.id,
            {
                "filename": "synthetic-diagnostic.png",
                "content_type": "image/png",
                "size": len(data),
                "label": "Synthetic full-frame result",
            },
            uuid4(),
        )
        try:
            with patch("medframe_apps.documents.tasks.enqueue_scan"):
                complete_result_upload(
                    self.center_request,
                    self.center_org.id,
                    version.id,
                    SimpleUploadedFile("synthetic-diagnostic.png", data, content_type="image/png"),
                )
            with self.assertRaises(DomainError):
                authorize_diagnostic_download(
                    self.center_request, self.center_org.id, row.id, version.id, context="center"
                )
            scan_document.run(str(version.id))
            version.refresh_from_db()
            self.assertEqual(version.scan_state, "clean")
            with default_storage.open(version.key, "rb") as stream:
                self.assertEqual(stream.read(), data)
            with self.assertRaises(DomainError):
                require_document(self.operator, self.organization.id, version.id)
            row = self.act(row, "submit_result")
            ticket = authorize_diagnostic_download(
                self.center_request, self.center_org.id, row.id, version.id, context="center"
            )
            self.assertEqual(redeem_ticket(self.center_request, ticket).id, version.id)
            self.act(row, "withdraw_sharing", reason="Revoke external access")
            with self.assertRaises(DomainError):
                redeem_ticket(self.center_request, ticket)
            clinic_ticket = authorize_diagnostic_download(
                self.clinic_request, self.organization.id, row.id, version.id, context="clinic"
            )
            self.assertEqual(redeem_ticket(self.clinic_request, clinic_ticket).id, version.id)
        finally:
            default_storage.delete(version.key)

    def test_invalid_dicom_and_wrong_center_upload(self):
        row = self.performed_request()
        with self.assertRaises(DomainError):
            begin_result_upload(
                self.center_request,
                self.center_org.id,
                row.id,
                {
                    "filename": "image.dcm",
                    "content_type": "application/dicom",
                    "size": 20,
                    "label": "DICOM",
                },
                uuid4(),
            )
        self.act(row, "recall", reason="Recall")
        with self.assertRaises(DomainError):
            begin_result_upload(
                self.center_request,
                self.center_org.id,
                row.id,
                {
                    "filename": "image.png",
                    "content_type": "image/png",
                    "size": 20,
                    "label": "Old assignment",
                },
                uuid4(),
            )
