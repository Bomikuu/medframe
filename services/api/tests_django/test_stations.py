import secrets
from contextlib import contextmanager
from datetime import timedelta
from uuid import uuid4

from django.db import DatabaseError, transaction
from django.test import Client, RequestFactory
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import ClinicalSession, User
from medframe_apps.encounters import services as care
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.patients.models import PatientAccessGrant
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.stations import handoffs, ownership, pairing
from medframe_apps.stations.context import EDITOR_COOKIE, current_request, digest
from medframe_apps.stations.inputs import DeviceInput, OfferInput
from medframe_apps.stations.models import (
    DeviceCredential,
    EditingLease,
    PairingChallenge,
    StationDevice,
    StationEvent,
)
from tests_django.test_boundaries import ClinicalFixture


class StationTests(ClinicalFixture):
    def setUp(self):
        self.patient = self.register()
        self.provider = ProviderProfile.objects.create(membership=self.membership)
        self.encounter = care.create_encounter(
            self.doctor,
            self.organization.id,
            self.patient.id,
            self.provider.id,
            self.branch.id,
            "Synthetic Station visit",
            uuid4(),
        )
        self.sender = self.request(self.doctor)
        self.admin_request = self.request(self.admin)

    def request(self, user):
        request = RequestFactory().post("/stations/context", content_type="application/json")
        request.user = user
        request.session = {"mfa_verified": True, "auth_realm": "staff"}
        request.COOKIES[EDITOR_COOKIE] = secrets.token_urlsafe(32)
        request.station_credential = None
        request.station_error = None
        return request

    def paired(self, user=None, mode="clinician", functions=None):
        device = StationDevice.objects.create(
            organization=self.organization,
            branch=self.branch,
            name="Synthetic tablet",
            mode=mode,
            state="active",
            functions=functions or ["clinical.read", "clinical.write"],
            created_by=self.admin,
        )
        request = self.request(user or self.doctor)
        request.station_credential = DeviceCredential.objects.create(
            device=device,
            digest=digest(secrets.token_urlsafe(32)),
            verification_phrase="ABCD23",
            expires_at=timezone.now() + timedelta(days=30),
        )
        return request

    @contextmanager
    def using(self, request):
        token = current_request.set(request)
        try:
            yield
        finally:
            current_request.reset(token)

    def claim(self, request=None):
        return ownership.status(
            request or self.sender, self.organization.id, self.encounter.id, "claim"
        )

    def offer(self, **extra):
        return handoffs.offer(
            self.sender,
            self.organization.id,
            self.encounter.id,
            OfferInput(expected_version=self.encounter.version, **extra),
        )

    def receiver(self, grant=True):
        user = User.objects.create_user(
            "receiver@station.example",
            "Synthetic password 12345",
            display_name="Receiving clinician",
        )
        member = Membership.objects.create(
            user=user, organization=self.organization, branch=self.branch
        )
        member.roles.add("doctor")
        provider = ProviderProfile.objects.create(membership=member)
        if grant:
            PatientAccessGrant.objects.create(
                organization=self.organization,
                patient=self.patient,
                membership=member,
                granted_by=self.admin,
            )
        return self.paired(user), provider

    def test_pairing_is_single_use_digest_only_and_requires_approval(self):
        device = pairing.create(
            self.admin_request,
            self.organization.id,
            DeviceInput(
                name="Room tablet",
                mode="clinician",
                branch_id=self.branch.id,
                functions=["clinical.read", "clinical.write"],
            ),
        )
        issued = pairing.manage(
            self.admin_request, self.organization.id, device.id, "pair", device.version
        )
        secret, credential = pairing.redeem(self.request(self.doctor), issued["code"])
        self.assertNotEqual(secret, credential.digest)
        self.assertFalse(PairingChallenge.objects.filter(digest=issued["code"]).exists())
        with self.assertRaises(DomainError):
            pairing.redeem(self.sender, issued["code"])
        device.refresh_from_db()
        self.assertEqual(device.state, "pending")
        approved = pairing.manage(
            self.admin_request, self.organization.id, device.id, "approve", device.version
        )
        self.assertEqual(approved["device"]["state"], "active")

    def test_expired_pairing_and_wrong_mode_functions_are_denied(self):
        request = self.paired()
        challenge = PairingChallenge.objects.create(
            device=request.station_credential.device,
            digest=digest("ABCD2345"),
            expires_at=timezone.now() - timedelta(seconds=1),
            issued_by=self.admin,
        )
        with self.assertRaises(DomainError):
            pairing.redeem(self.sender, "ABCD2345")
        self.assertIsNone(challenge.consumed_at)
        with self.assertRaises(DomainError):
            pairing.create(
                self.admin_request,
                self.organization.id,
                DeviceInput(
                    name="Unsafe kiosk",
                    mode="kiosk",
                    branch_id=self.branch.id,
                    functions=["clinical.write"],
                ),
            )

    def test_clinician_cannot_administer_devices_or_bypass_branch(self):
        with self.assertRaises(DomainError):
            pairing.create(
                self.sender,
                self.organization.id,
                DeviceInput(
                    name="Unpermitted",
                    mode="display",
                    branch_id=self.branch.id,
                    functions=["queue.display"],
                ),
            )
        other = Organization.objects.create(name="Other synthetic clinic")
        branch = Branch.objects.create(organization=other, name="Other branch")
        with self.assertRaises(DomainError):
            pairing.create(
                self.admin_request,
                self.organization.id,
                DeviceInput(
                    name="Wrong branch",
                    mode="display",
                    branch_id=branch.id,
                    functions=["queue.display"],
                ),
            )

    def test_native_mfa_and_staff_realm_are_required(self):
        self.sender.session["auth_realm"] = "patient"
        with self.assertRaises(DomainError):
            self.claim()
        self.sender.session = {"auth_realm": "staff"}
        with self.assertRaises(DomainError):
            self.claim()

    def test_lease_blocks_old_browser_and_contextless_service_writes(self):
        self.claim()
        other = self.request(self.doctor)
        with self.using(other), self.assertRaises(DomainError):
            care.save_encounter_draft(self.doctor, self.organization.id, self.encounter.id, {}, 1)
        with self.assertRaises(DomainError):
            care.transition_encounter(
                self.doctor, self.organization.id, self.encounter.id, "completed", 1
            )
        with self.using(self.sender):
            saved = care.save_encounter_draft(
                self.doctor, self.organization.id, self.encounter.id, {}, 1
            )
        self.assertEqual(saved.version, 2)

    def test_pending_cancel_and_expiry_leave_ownership_with_sender(self):
        self.claim()
        offered = self.offer()
        handoffs.cancel(self.sender, self.organization.id, self.encounter.id, offered["id"])
        self.assertTrue(
            ownership.status(self.sender, self.organization.id, self.encounter.id)["can_edit"]
        )
        offered = self.offer()
        from medframe_apps.stations.models import ConsultationHandoff

        ConsultationHandoff.objects.filter(id=offered["id"]).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        with self.assertRaises(DomainError):
            handoffs.accept(self.paired(), offered["code"])
        self.assertEqual(
            EditingLease.objects.get(encounter=self.encounter).owner_id, self.doctor.id
        )

    def test_device_acceptance_moves_same_draft_restores_selection_and_blocks_sender(self):
        self.claim()
        offered = self.offer(selection={"tab": "dental", "tooth": "24", "surface": "mesial"})
        receiver = self.paired()
        result = handoffs.accept(receiver, offered["code"])
        self.assertEqual(result["encounter_id"], str(self.encounter.id))
        lease = EditingLease.objects.get(encounter=self.encounter)
        self.assertEqual(lease.selection["tooth"], "24")
        with self.using(self.sender), self.assertRaises(DomainError):
            care.save_encounter_draft(self.doctor, self.organization.id, self.encounter.id, {}, 1)
        with self.using(receiver):
            care.save_encounter_draft(self.doctor, self.organization.id, self.encounter.id, {}, 1)
        with self.assertRaises(DomainError):
            handoffs.accept(receiver, offered["code"])
        self.encounter.refresh_from_db()
        self.assertEqual(self.encounter.provider_id, self.provider.id)

    def test_unpaired_or_wrong_named_clinician_cannot_preview(self):
        self.claim()
        offered = self.offer()
        with self.assertRaises(DomainError):
            handoffs.preview(self.sender, offered["code"])
        receiver, _ = self.receiver()
        with self.assertRaises(DomainError):
            handoffs.preview(receiver, offered["code"])

    def test_new_saved_version_invalidates_handoff(self):
        self.claim()
        offered = self.offer()
        with self.using(self.sender):
            care.save_encounter_draft(self.doctor, self.organization.id, self.encounter.id, {}, 1)
        with self.assertRaises(DomainError):
            handoffs.accept(self.paired(), offered["code"])

    def test_lock_and_lease_expiry_require_explicit_claim(self):
        self.claim()
        ownership.status(self.sender, self.organization.id, self.encounter.id, "lock")
        with self.using(self.sender), self.assertRaises(DomainError):
            care.save_encounter_draft(self.doctor, self.organization.id, self.encounter.id, {}, 1)
        self.claim()
        EditingLease.objects.filter(encounter=self.encounter).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        self.assertFalse(
            ownership.status(self.sender, self.organization.id, self.encounter.id)["can_edit"]
        )
        self.claim()
        self.assertTrue(
            ownership.status(self.sender, self.organization.id, self.encounter.id)["can_edit"]
        )

    def test_revocation_blocks_source_handoff_and_read_only_device_cannot_write(self):
        sender = self.paired()
        self.sender = sender
        self.claim()
        offered = self.offer()
        DeviceCredential.objects.filter(id=sender.station_credential.id).update(revoked=True)
        with self.assertRaises(DomainError):
            handoffs.accept(self.paired(), offered["code"])
        readonly = self.paired(functions=["clinical.read"])
        with self.using(readonly), self.assertRaises(DomainError):
            care.save_encounter_draft(self.doctor, self.organization.id, self.encounter.id, {}, 1)

    def test_responsibility_acceptance_is_attributed_and_increments_existing_version(self):
        self.claim()
        receiver, provider = self.receiver()
        offered = self.offer(
            kind="responsibility",
            provider_id=provider.id,
            summary="Review findings",
            tasks="Confirm plan",
        )
        self.assertEqual(handoffs.preview(receiver, offered["code"])["summary"], "Review findings")
        handoffs.accept(receiver, offered["code"])
        self.encounter.refresh_from_db()
        self.assertEqual(self.encounter.provider_id, provider.id)
        self.assertEqual(self.encounter.version, 2)
        self.assertTrue(
            StationEvent.objects.filter(actor=receiver.user, kind="handoff.accepted").exists()
        )

    def test_responsibility_receiver_without_patient_grant_cannot_accept(self):
        self.claim()
        receiver, provider = self.receiver(grant=False)
        offered = self.offer(
            kind="responsibility", provider_id=provider.id, summary="Review findings"
        )
        with self.assertRaises(DomainError):
            handoffs.accept(receiver, offered["code"])
        self.encounter.refresh_from_db()
        self.assertEqual(self.encounter.provider_id, self.provider.id)

    def test_finalized_responsibility_is_immutable_and_events_append_only(self):
        self.claim()
        receiver, provider = self.receiver()
        self.encounter.status = "finalized"
        self.encounter.save(update_fields=["status"])
        with self.assertRaises(DomainError):
            self.offer(kind="responsibility", provider_id=provider.id, summary="Not permitted")
        with self.assertRaises(DatabaseError), transaction.atomic():
            StationEvent.objects.filter(kind="editor.claimed").update(kind="rewritten")

    def test_superuser_without_clinical_grant_has_no_editor_bypass(self):
        with self.assertRaises(DomainError):
            self.claim(self.admin_request)

    def test_paired_nonclinical_middleware_denies_staff_records_and_public_context_has_no_phi(self):
        request = self.paired(mode="kiosk", functions=["booking"])
        secret = secrets.token_urlsafe(32)
        DeviceCredential.objects.filter(id=request.station_credential.id).update(
            digest=digest(secret)
        )
        client = Client()
        client.cookies["medframe_device"] = secret
        response = client.post(
            "/graphql",
            {"query": "query { currentUser { id } }"},
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(response.status_code, 403)
        response = client.post(
            "/stations/context",
            {},
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(self.patient.full_name, response.content.decode())
        self.assertNotIn(str(self.patient.id), response.content.decode())

    def test_management_api_requires_live_native_session(self):
        client = Client()
        client.force_login(self.admin)
        session = client.session
        session["mfa_verified"], session["auth_realm"] = True, "staff"
        session.save()
        ClinicalSession.objects.create(
            user=self.admin,
            session_key=session.session_key,
            last_seen_at=timezone.now(),
            expires_at=timezone.now() + timedelta(hours=8),
        )
        response = client.post(
            "/stations/manage",
            {"organization_id": str(self.organization.id)},
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(response.status_code, 200)
        ClinicalSession.objects.filter(user=self.admin).update(revoked=True)
        response = client.post(
            "/stations/manage",
            {"organization_id": str(self.organization.id)},
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(response.status_code, 401)
