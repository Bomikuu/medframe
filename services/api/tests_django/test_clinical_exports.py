import json
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from django.core import signing
from django.test import RequestFactory

from config.errors import DomainError
from medframe_apps.encounters.services import create_encounter_amendment, save_encounter_draft
from medframe_apps.interoperability.review import SALT, download_export, review_export
from medframe_apps.interoperability.schema import ClinicalExport
from medframe_apps.interoperability.views import download
from tests_django.test_boundaries import ClinicalFixture
from tests_django.test_encounters import EncounterWorkflowTests


class ClinicalExportTests(ClinicalFixture):
    start = EncounterWorkflowTests.start
    content = EncounterWorkflowTests.content
    finalize = EncounterWorkflowTests.finalize

    def setUp(self):
        self.encounter = self.start()
        self.revision = self.finalize(self.encounter)
        self.request = SimpleNamespace(
            user=self.doctor, session={"mfa_verified": True, "auth_realm": "staff"}
        )
        self.selection = {
            "organization_id": str(self.organization.id),
            "encounter_id": str(self.encounter.id),
            "revision_id": str(self.revision.id),
            "sections": ["soap", "diagnoses", "observations"],
        }

    def reviewed(self):
        return review_export(self.request, self.selection)

    def test_exact_revision_schema_and_allowlisted_sections(self):
        reviewed = self.reviewed()
        envelope, body = download_export(
            self.request, {"proof": reviewed["proof"], "acknowledged": True}
        )
        ClinicalExport.model_validate_json(body)
        self.assertEqual(str(envelope.revision.id), str(self.revision.id))
        self.assertEqual(envelope.sections.soap.subjective, self.content()["soap"]["subjective"])
        self.assertEqual(envelope.sections.diagnoses[0].certainty, "suspected")
        value = json.loads(body)
        self.assertNotIn("dental", value["sections"])
        self.assertNotIn("document_ids", value["sections"])
        self.assertNotIn("history_revision_id", body.decode())
        self.assertNotIn("/documents/", body.decode())
        self.selection["sections"] += ["dental", "anatomy", "procedures"]
        reviewed = self.reviewed()
        envelope, _ = download_export(
            self.request, {"proof": reviewed["proof"], "acknowledged": True}
        )
        self.assertEqual(envelope.sections.dental.findings[0].tooth, "16")
        self.assertEqual(envelope.sections.dental.chart[0].encounter_id, self.encounter.id)

    def test_revoked_grant_after_review_denies_download(self):
        reviewed = self.reviewed()
        self.encounter.patient.access_grants.update(active=False)
        with self.assertRaises(DomainError):
            download_export(self.request, {"proof": reviewed["proof"], "acknowledged": True})

    def test_wrong_tenant_revision_unsupported_and_duplicate_sections(self):
        for values in (
            {"organization_id": str(uuid4())},
            {"revision_id": str(uuid4())},
            {"sections": ["files"]},
            {"sections": ["soap", "soap"]},
            {"sections": []},
        ):
            with self.subTest(values=values), self.assertRaises(DomainError):
                review_export(self.request, {**self.selection, **values})

    def test_realm_mfa_station_admin_and_other_user_denied(self):
        reviewed = self.reviewed()
        for changes in (
            {"session": {}},
            {"session": {"mfa_verified": True, "auth_realm": "patient"}},
            {"station_access": object()},
            {"user": self.admin},
        ):
            old = vars(self.request).copy()
            self.request.__dict__.update(changes)
            with self.subTest(changes=list(changes)), self.assertRaises(DomainError):
                self.reviewed()
            with self.assertRaises(DomainError):
                download_export(self.request, {"proof": reviewed["proof"], "acknowledged": True})
            self.request.__dict__.clear()
            self.request.__dict__.update(old)

    def test_tampered_expired_and_unacknowledged_proof(self):
        reviewed = self.reviewed()
        with self.assertRaises(DomainError):
            download_export(self.request, {"proof": reviewed["proof"]})
        with self.assertRaises(DomainError):
            download_export(
                self.request, {"proof": reviewed["proof"] + "bad", "acknowledged": True}
            )
        with patch("django.core.signing.time.time", return_value=0):
            expired = signing.dumps(signing.loads(reviewed["proof"], salt=SALT), salt=SALT)
        with self.assertRaises(DomainError):
            download_export(self.request, {"proof": expired, "acknowledged": True})

    def test_size_and_changed_metadata_require_new_review(self):
        with (
            patch("medframe_apps.interoperability.records.MAX_BYTES", 10),
            self.assertRaises(DomainError),
        ):
            self.reviewed()
        reviewed = self.reviewed()
        self.encounter.patient.full_name = "Updated synthetic identity"
        self.encounter.patient.save()
        with self.assertRaises(DomainError) as error:
            download_export(self.request, {"proof": reviewed["proof"], "acknowledged": True})
        self.assertEqual(error.exception.code, "REVIEW_CHANGED")

    def test_attachment_headers_use_post_without_token_url(self):
        reviewed = self.reviewed()
        request = RequestFactory().post(
            "/interoperability/download",
            json.dumps({"proof": reviewed["proof"], "acknowledged": True}),
            content_type="application/json",
        )
        request.user, request.session = self.request.user, self.request.session
        response = download(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertNotIn(self.encounter.patient.full_name, response["Content-Disposition"])

    def test_historical_export_does_not_read_an_unpublished_amendment(self):
        encounter = create_encounter_amendment(
            self.doctor,
            self.organization.id,
            self.encounter.id,
            "Synthetic amendment",
            self.revision.version,
        )
        content = self.content()
        content["soap"]["subjective"] = "Unpublished synthetic amendment"
        save_encounter_draft(
            self.doctor, self.organization.id, encounter.id, content, encounter.version
        )
        reviewed = self.reviewed()
        _, body = download_export(self.request, {"proof": reviewed["proof"], "acknowledged": True})
        self.assertNotIn("Unpublished synthetic amendment", body.decode())
        self.assertIn(self.revision.content["soap"]["subjective"], body.decode())
