import io
import json
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from django.db import DatabaseError, transaction
from django.test import RequestFactory

from config.errors import DomainError
from medframe_apps.documents.models import Document, DocumentVersion
from medframe_apps.documents.services import begin_document_upload
from medframe_apps.organizations.models import Organization
from medframe_apps.websites import domains, public, services
from medframe_apps.websites.content import defaults
from medframe_apps.websites.models import ClinicWebsite, WebsitePublication
from tests_django.test_boundaries import ClinicalFixture


class WebsiteTests(ClinicalFixture):
    def test_public_queue_has_only_numbers_and_states(self):
        from zoneinfo import ZoneInfo

        from django.utils import timezone

        from medframe_apps.operations.models import QueueDay, QueueTicket
        from medframe_apps.providers.models import ProviderProfile

        patient = self.register()
        provider = ProviderProfile.objects.create(membership=self.membership)
        day = QueueDay.objects.create(
            branch=self.branch,
            date=timezone.now().astimezone(ZoneInfo(self.organization.timezone)).date(),
        )
        QueueTicket.objects.create(
            day=day, patient=patient, provider=provider, number=1, order=1, created_by=self.doctor
        )
        content = {
            **self.content,
            "queue_branch_id": str(self.branch.id),
            "sections": [{"kind": "queue", "visible": True, "title": "Queue"}],
        }
        self.save(content)
        self.publish()
        response = self.get()
        self.assertEqual(
            json.loads(response.content)["queue"], [{"number": 1, "status": "waiting"}]
        )
        self.assertNotIn(str(patient.id), response.content.decode())
        self.assertNotIn(patient.full_name, response.content.decode())

    def setUp(self):
        self.request = SimpleNamespace(
            user=self.admin, session={"mfa_verified": True, "auth_realm": "staff"}
        )
        self.content = defaults("Synthetic public clinic")
        self.content.update(
            headline="Synthetic clinic introduction",
            seo_title="Synthetic clinic",
            seo_description="Synthetic public clinic information",
            indexable=True,
        )

    def save(self, content=None, version=0, slug="synthetic-clinic"):
        return services.action(
            self.request,
            self.organization.id,
            "save",
            {"slug": slug, "content": content or self.content},
            version,
        )

    def publish(self, version=1):
        return services.action(
            self.request, self.organization.id, "publish", {"reviewed": True}, version
        )

    def get(self):
        return public.page(RequestFactory().get("/websites/synthetic-clinic"), "synthetic-clinic")

    def image(self, purpose="website", state="clean", organization=None):
        doc = Document.objects.create(
            organization=organization or self.organization,
            uploaded_by=self.admin,
            purpose=purpose,
            label="Synthetic image",
            patient=self.register() if purpose == "clinical" else None,
        )
        return DocumentVersion.objects.create(
            document=doc,
            uploaded_by=self.admin,
            key="synthetic/" + str(uuid4()),
            filename="image.png",
            content_type="image/png",
            expected_size=20,
            scan_state=state,
        )

    def test_native_admin_mfa_and_tenant_boundaries(self):
        self.request.session["mfa_verified"] = False
        with self.assertRaises(DomainError):
            services.setup(self.request, self.organization.id)
        self.request.session = {"mfa_verified": True, "auth_realm": "patient"}
        with self.assertRaises(DomainError):
            services.setup(self.request, self.organization.id)
        self.request.session["auth_realm"] = "staff"
        self.request.user = self.doctor
        with self.assertRaises(DomainError):
            services.setup(self.request, self.organization.id)
        self.request.user = self.admin
        with self.assertRaises(DomainError):
            services.setup(
                self.request, Organization.objects.create(name="Other synthetic clinic").id
            )

    def test_draft_publication_snapshot_and_withdrawal(self):
        self.save()
        self.assertEqual(self.get().status_code, 404)
        self.publish()
        first = json.loads(self.get().content)
        changed = {**self.content, "headline": "Changed private draft"}
        self.save(changed, 2)
        self.assertEqual(json.loads(self.get().content), first)
        services.action(self.request, self.organization.id, "unpublish", {}, 3)
        self.assertEqual(self.get().status_code, 404)
        self.assertEqual(WebsitePublication.objects.count(), 1)

    def test_version_conflict_and_explicit_public_review(self):
        self.save()
        with self.assertRaises(DomainError):
            self.save(version=0)
        with self.assertRaises(DomainError):
            services.action(self.request, self.organization.id, "publish", {}, 1)
        self.publish()
        with self.assertRaises(DomainError):
            self.publish()
        self.assertEqual(WebsitePublication.objects.count(), 1)

    def test_restore_is_draft_only_and_slug_is_stable(self):
        self.save()
        published = self.publish()
        revision = published["history"][0]["id"]
        self.save({**self.content, "headline": "Second snapshot"}, 2)
        self.publish(3)
        result = services.action(
            self.request, self.organization.id, "restore", {"revision_id": revision}, 4
        )
        self.assertEqual(result["content"]["headline"], self.content["headline"])
        self.assertEqual(json.loads(self.get().content)["content"]["headline"], "Second snapshot")
        with self.assertRaises(DomainError):
            self.save(version=5, slug="changed-address")

    def test_unsafe_clinical_and_foreign_assets_never_publish(self):
        for image in [
            self.image("clinical"),
            self.image(state="pending"),
            self.image(organization=Organization.objects.create(name="Synthetic image owner")),
        ]:
            with self.assertRaises(DomainError):
                self.save({**self.content, "hero_image_id": str(image.id)})
        self.assertFalse(ClinicWebsite.objects.exists())

    def test_public_asset_requires_current_publication_and_live_clean_state(self):
        image = self.image()
        self.save({**self.content, "hero_image_id": str(image.id)})
        request = RequestFactory().get("/asset")
        self.assertEqual(public.asset(request, "synthetic-clinic", image.id).status_code, 404)
        self.publish()
        with patch.object(
            public.default_storage, "open", return_value=io.BytesIO(b"synthetic image")
        ):
            response = public.asset(request, "synthetic-clinic", image.id)
            self.assertEqual(response.status_code, 200)
            response.file_to_stream.close()
        image.scan_state = "rejected"
        with self.assertRaises(DatabaseError), transaction.atomic():
            image.save()
        services.action(self.request, self.organization.id, "unpublish", {}, 2)
        self.assertEqual(public.asset(request, "synthetic-clinic", image.id).status_code, 404)

    def test_asset_removed_from_new_snapshot_is_no_longer_public(self):
        image = self.image()
        self.save({**self.content, "hero_image_id": str(image.id)})
        self.publish()
        self.save(self.content, 2)
        self.publish(3)
        self.assertEqual(
            public.asset(RequestFactory().get("/asset"), "synthetic-clinic", image.id).status_code,
            404,
        )

    def test_publications_cannot_be_updated_or_deleted(self):
        self.save()
        self.publish()
        with self.assertRaises(DatabaseError), transaction.atomic():
            WebsitePublication.objects.update(content={})
        with self.assertRaises(DatabaseError), transaction.atomic():
            WebsitePublication.objects.all().delete()

    def test_index_contains_only_active_published_indexable_sites(self):
        request = RequestFactory().get("/index")
        self.save()
        self.assertEqual(json.loads(public.index(request).content)["sites"], [])
        self.publish()
        self.assertEqual(len(json.loads(public.index(request).content)["sites"]), 1)
        self.organization.active = False
        self.organization.save()
        self.assertEqual(json.loads(public.index(request).content)["sites"], [])
        self.assertEqual(self.get().status_code, 404)

    def test_domain_requires_exact_dns_proof_and_publication(self):
        self.save()
        website = ClinicWebsite.objects.get()
        domain = domains.prepare(website, "clinic.synthetic.example")
        request = RequestFactory().get("/resolve", {"hostname": domain.hostname})
        self.assertIsNone(json.loads(public.resolve(request).content)["slug"])
        with patch.object(
            domains.subprocess, "run", return_value=SimpleNamespace(stdout='"wrong"')
        ):
            with self.assertRaises(DomainError):
                domains.verify(website)
        with patch.object(
            domains.subprocess,
            "run",
            return_value=SimpleNamespace(stdout='"' + domain.challenge + '"'),
        ):
            domains.verify(website)
        self.assertIsNone(json.loads(public.resolve(request).content)["slug"])
        self.publish()
        self.assertEqual(json.loads(public.resolve(request).content)["slug"], website.slug)
        services.action(self.request, self.organization.id, "unpublish", {}, 2)
        self.assertIsNone(json.loads(public.resolve(request).content)["slug"])

    def test_content_rejects_unbounded_code_and_foreign_queue_branch(self):
        for value in [
            {**self.content, "html": "<script>unsafe</script>"},
            {**self.content, "palette": "url(unsafe)"},
            {**self.content, "sections": [self.content["sections"][0]] * 2},
            {**self.content, "queue_branch_id": str(uuid4())},
        ]:
            with self.assertRaises(DomainError):
                self.save(value)
        for value in ["http://clinic.example/path", "127.0.0.1", "clinic.local", "x\nexample.com"]:
            with self.assertRaises(DomainError):
                domains.hostname(value)

    def test_website_upload_uses_image_only_nonclinical_pipeline(self):
        metadata = {
            "filename": "clinic.png",
            "content_type": "image/png",
            "size": 20,
            "label": "Synthetic public image",
        }
        version = begin_document_upload(
            self.admin, self.organization.id, None, None, "website", metadata
        )
        self.assertEqual(version.document.purpose, "website")
        self.assertIsNone(version.document.patient_id)
        with self.assertRaises(DomainError):
            begin_document_upload(
                self.doctor, self.organization.id, None, None, "website", metadata
            )
        with self.assertRaises(DomainError):
            begin_document_upload(
                self.admin,
                self.organization.id,
                None,
                None,
                "website",
                {**metadata, "filename": "file.pdf", "content_type": "application/pdf"},
            )
