"""Scoped expiry, reveal authorization and single-use pairing regressions."""

import json
from datetime import timedelta

from django.test import RequestFactory
from django.utils import timezone

from config.crypto import cipher
from config.errors import DomainError
from config.middleware import RequestBoundaryMiddleware
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.stations import pairing, views
from medframe_apps.stations.inputs import DeviceInput
from medframe_apps.stations.models import DeviceCredential, PairingChallenge, PairingCodeReveal
from tests_django.test_boundaries import ClinicalFixture


class PairingDisplayTests(ClinicalFixture):
    def setUp(self):
        self.request = RequestFactory().post("/stations/manage", content_type="application/json")
        self.request.user = self.admin
        self.request.session = {"mfa_verified": True, "auth_realm": "staff"}
        self.data = DeviceInput(
            name="Synthetic pairing tablet",
            mode="clinician",
            branch_id=self.branch.id,
            functions=["clinical.read", "clinical.write"],
        )
        self.device = pairing.create(self.request, self.organization.id, self.data)

    def issue(self):
        self.device.refresh_from_db()
        return pairing.manage(
            self.request, self.organization.id, self.device.id, "pair", self.device.version
        )

    def reveal(self):
        return pairing.current_code(self.request, self.organization.id, self.device.id)

    def test_reopening_reuses_same_encrypted_code_without_revoking_or_reissuing(self):
        issued = self.issue()
        encrypted = PairingCodeReveal.objects.get()
        self.assertNotIn(issued["code"], encrypted.encrypted_code)
        self.assertEqual(
            cipher().decrypt(encrypted.encrypted_code.encode()).decode(), issued["code"]
        )
        for _ in range(2):
            result = self.reveal()
            self.assertEqual(result["transfer"]["code"], issued["code"])
            self.assertEqual(result["transfer"]["expires_at"], issued["expires_at"])
            self.assertEqual(result["device"]["version"], issued["device"]["version"])
        self.assertEqual(PairingChallenge.objects.count(), 1)
        self.assertNotIn("code", pairing.device_data(self.device))
        self.assertNotIn("encrypted_code", pairing.device_data(self.device))

    def test_consumed_code_cannot_be_displayed_and_approval_is_still_required(self):
        issued = self.issue()
        _, credential = pairing.redeem(self.request, issued["code"])
        self.assertEqual(self.reveal()["status"], "pending")
        self.assertIsNone(self.reveal()["transfer"])
        self.assertEqual(PairingCodeReveal.objects.get().encrypted_code, "")
        self.assertEqual(credential.device.state, "pending")
        with self.assertRaises(DomainError):
            pairing.redeem(self.request, issued["code"])

    def test_expiry_clears_display_copy_and_legacy_hash_is_not_fabricated(self):
        self.assertEqual(self.reveal()["status"], "not_created")
        self.issue()
        PairingCodeReveal.objects.all().delete()
        self.assertEqual(self.reveal()["status"], "legacy")
        self.assertIsNone(self.reveal()["transfer"])
        self.issue()
        PairingChallenge.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.reveal()["status"], "expired")
        self.assertFalse(PairingCodeReveal.objects.exclude(encrypted_code="").exists())

    def test_regeneration_revocation_and_scope_change_invalidate_old_display_copy(self):
        first = self.issue()
        second = self.issue()
        self.assertNotEqual(first["code"], second["code"])
        self.assertEqual(PairingCodeReveal.objects.exclude(encrypted_code="").count(), 1)
        with self.assertRaises(DomainError):
            pairing.redeem(self.request, first["code"])
        self.device.refresh_from_db()
        pairing.manage(
            self.request, self.organization.id, self.device.id, "revoke", self.device.version
        )
        self.assertIsNone(self.reveal()["transfer"])
        self.assertFalse(PairingCodeReveal.objects.exclude(encrypted_code="").exists())
        self.issue()
        self.device.refresh_from_db()
        pairing.update(
            self.request,
            self.organization.id,
            self.device.id,
            self.device.version,
            self.data.model_copy(update={"functions": ["clinical.read"]}),
        )
        self.assertEqual(self.reveal()["status"], "expired")
        self.assertFalse(PairingCodeReveal.objects.exclude(encrypted_code="").exists())
        self.assertFalse(DeviceCredential.objects.filter(revoked=False).exists())

    def test_reveal_requires_live_membership_mfa_staff_realm_and_branch(self):
        self.issue()
        self.request.user = self.doctor
        with self.assertRaises(DomainError):
            self.reveal()
        self.request.user = self.admin
        self.request.session = {"auth_realm": "staff"}
        with self.assertRaises(DomainError):
            self.reveal()
        self.request.session = {"auth_realm": "patient", "mfa_verified": True}
        with self.assertRaises(DomainError):
            self.reveal()
        self.request.session = {"auth_realm": "staff", "mfa_verified": True}
        membership = Membership.objects.get(user=self.admin, organization=self.organization)
        membership.branch = Branch.objects.create(organization=self.organization, name="Other")
        membership.save()
        with self.assertRaises(DomainError):
            self.reveal()
        membership.branch = None
        membership.active = False
        membership.save()
        with self.assertRaises(DomainError):
            self.reveal()

    def test_cross_tenant_and_corrupt_ciphertext_are_denied(self):
        self.issue()
        other = Organization.objects.create(name="Other synthetic tenant")
        with self.assertRaises(DomainError):
            pairing.current_code(self.request, other.id, self.device.id)
        PairingCodeReveal.objects.update(encrypted_code="invalid")
        with self.assertRaises(DomainError) as error:
            self.reveal()
        self.assertEqual(error.exception.code, "CODE_UNAVAILABLE")

    def test_native_manage_response_is_no_store_and_list_has_no_secret(self):
        issued = self.issue()
        request = RequestFactory().post(
            "/stations/manage",
            data=json.dumps(
                {
                    "organization_id": str(self.organization.id),
                    "device_id": str(self.device.id),
                    "action": "current_code",
                }
            ),
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        request.user, request.session = self.request.user, self.request.session
        response = RequestBoundaryMiddleware(views.manage)(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(json.loads(response.content)["transfer"]["code"], issued["code"])
        request = RequestFactory().post(
            "/stations/manage",
            data=json.dumps({"organization_id": str(self.organization.id)}),
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        request.user, request.session = self.request.user, self.request.session
        response = views.manage(request)
        self.assertNotIn(issued["code"], response.content.decode())
        self.assertNotIn("encrypted_code", response.content.decode())
