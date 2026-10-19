from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

from django.utils import timezone

from config.errors import DomainError
from medframe_apps.diagnostics.portal import (
    patient_request_detail,
    patient_request_page,
    patient_select_center,
)
from medframe_apps.portal.models import PortalInvitation, PortalLink
from medframe_apps.portal.releases import preview_release, publish_release
from tests_django.diagnostics_fixture import DiagnosticFixture


class DiagnosticPortalTests(DiagnosticFixture):
    def connect(self):
        invitation = PortalInvitation.objects.create(
            organization=self.organization,
            patient=self.patient,
            issued_by=self.doctor,
            email=self.doctor.email,
            relationship="self",
            method="in_person",
            token_hash="d" * 64,
            expires_at=timezone.now() + timedelta(days=1),
        )
        link = PortalLink.objects.create(
            organization=self.organization,
            patient=self.patient,
            user=self.doctor,
            invitation=invitation,
            relationship="self",
        )
        return link, SimpleNamespace(
            user=self.doctor, session={"mfa_verified": True, "auth_realm": "patient"}
        )

    def test_patient_projection_selection_and_revocation(self):
        row = self.create_request()
        link, request = self.connect()
        self.assertEqual(patient_request_page(request, link.id)["items"], [])
        from medframe_apps.diagnostics.services import sharing_preview

        row = self.act(row, "issue", preview_digest=sharing_preview(row)["digest"])
        detail = patient_request_detail(request, link.id, row.id)
        self.assertNotIn("question", str(detail))
        self.assertEqual(len(detail["centers"]), 1)
        selected = patient_select_center(
            request, link.id, row.id, self.center.id, row.version, uuid4()
        )
        self.assertEqual(selected["state"], "sent")
        link.active = False
        link.version += 1
        link.save()
        with self.assertRaises(DomainError):
            patient_request_detail(request, link.id, row.id)

    def test_explicit_reviewed_release_keeps_old_correction_snapshot(self):
        row = self.submitted_request()
        selection = {
            "summary": "Synthetic reviewed report",
            "diagnostic_result_ids": [str(row.current_result_id)],
        }
        with self.assertRaises(DomainError):
            preview_release(self.doctor, self.organization.id, self.patient.id, selection)
        row = self.act(
            row,
            "review",
            result_id=str(row.current_result_id),
            acknowledged=True,
            interpretation="Clinician review",
        )
        preview = preview_release(self.doctor, self.organization.id, self.patient.id, selection)
        release = publish_release(
            self.doctor,
            self.organization.id,
            self.patient.id,
            selection,
            preview["digest"],
            uuid4(),
        )
        row = self.act(row, "start_correction", reason="Correction")
        row = self.act(row, "save_result", report="New corrected report")
        row = self.act(row, "submit_result")
        release.refresh_from_db()
        self.assertEqual(release.payload["diagnostics"][0]["report"], "Synthetic center report")
        with self.assertRaises(DomainError):
            preview_release(self.doctor, self.organization.id, self.patient.id, selection)
