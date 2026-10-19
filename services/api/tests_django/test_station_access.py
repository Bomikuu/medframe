"""Synthetic passwordless handoff boundaries; accumulated once at the phase gate."""

import secrets
from datetime import timedelta
from uuid import uuid4

from django.contrib.auth import login
from django.contrib.sessions.backends.db import SessionStore
from django.test import Client, RequestFactory
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.encounters import services as care
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.stations import handoffs, ownership
from medframe_apps.stations.context import EDITOR_COOKIE, current_request, digest
from medframe_apps.stations.inputs import OfferInput
from medframe_apps.stations.models import DeviceCredential, StationAccessSession, StationDevice
from tests_django.test_boundaries import ClinicalFixture


class StationAccessTests(ClinicalFixture):
    def setUp(self):
        self.patient = self.register()
        self.provider = ProviderProfile.objects.create(membership=self.membership)
        self.encounter = care.create_encounter(
            self.doctor,
            self.organization.id,
            self.patient.id,
            self.provider.id,
            self.branch.id,
            "Synthetic code access",
            uuid4(),
        )
        self.sender = RequestFactory().post("/stations/handoff")
        self.sender.session = SessionStore()
        login(self.sender, self.doctor, backend="django.contrib.auth.backends.ModelBackend")
        self.sender.user = self.doctor
        self.sender.session["mfa_verified"] = True
        self.sender.session["auth_realm"] = "staff"
        self.sender.session.save()
        self.source = ClinicalSession.objects.create(
            user=self.doctor,
            session_key=self.sender.session.session_key,
            last_seen_at=timezone.now(),
            expires_at=timezone.now() + timedelta(hours=8),
        )
        self.sender.COOKIES[EDITOR_COOKIE] = secrets.token_urlsafe(32)
        self.sender.station_credential, self.sender.station_error = None, None
        ownership.status(self.sender, self.organization.id, self.encounter.id, "claim")
        self.secret = secrets.token_urlsafe(32)
        device = StationDevice.objects.create(
            organization=self.organization,
            branch=self.branch,
            name="Synthetic tablet",
            mode="clinician",
            state="active",
            functions=["clinical.read", "clinical.write"],
            created_by=self.admin,
        )
        self.credential = DeviceCredential.objects.create(
            device=device,
            digest=digest(self.secret),
            verification_phrase="ABCD23",
            expires_at=timezone.now() + timedelta(days=30),
        )
        self.client = Client()
        self.client.cookies["medframe_device"] = self.secret

    def offer(self):
        return handoffs.offer(
            self.sender,
            self.organization.id,
            self.encounter.id,
            OfferInput(expected_version=self.encounter.version, selection={"tab": "notes"}),
        )

    def redeem(self, code):
        return self.client.post(
            "/stations/access",
            {"code": code},
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )

    def graphql(self, query, variables=None):
        return self.client.post(
            "/graphql",
            {"query": query, "variables": variables or {}},
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )

    def test_code_opens_native_short_session_without_password_or_mfa_change(self):
        password = self.doctor.password
        response = self.redeem(self.offer()["code"])
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["encounter_id"], str(self.encounter.id))
        session = self.client.session
        self.assertEqual(session["_auth_user_id"], str(self.doctor.id))
        self.assertEqual(session["auth_method"], "station_handoff")
        row = StationAccessSession.objects.get(session__session_key=session.session_key)
        self.assertLessEqual(row.expires_at, timezone.now() + timedelta(minutes=30))
        self.doctor.refresh_from_db()
        self.assertEqual(self.doctor.password, password)
        self.assertEqual(ClinicalSession.objects.filter(user=self.doctor).count(), 2)

    def test_code_single_use_and_previous_writer_is_blocked(self):
        offered = self.offer()
        self.assertEqual(self.redeem(offered["code"]).status_code, 200)
        self.assertNotEqual(self.redeem(offered["code"]).status_code, 200)
        token = current_request.set(self.sender)
        try:
            with self.assertRaises(DomainError):
                care.save_encounter_draft(
                    self.doctor, self.organization.id, self.encounter.id, {}, 1
                )
        finally:
            current_request.reset(token)

    def test_revoked_source_or_auth_epoch_rejects_code(self):
        offered = self.offer()
        ClinicalSession.objects.filter(id=self.source.id).update(revoked=True)
        self.assertNotEqual(self.redeem(offered["code"]).status_code, 200)
        self.assertFalse(StationAccessSession.objects.exists())

    def test_stale_draft_does_not_leave_logged_in_session(self):
        offered = self.offer()
        token = current_request.set(self.sender)
        try:
            care.save_encounter_draft(self.doctor, self.organization.id, self.encounter.id, {}, 1)
        finally:
            current_request.reset(token)
        self.assertEqual(self.redeem(offered["code"]).status_code, 409)
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertFalse(StationAccessSession.objects.exists())

    def test_unapproved_kiosk_and_unpaired_receivers_are_denied(self):
        offered = self.offer()
        self.credential.device.mode = "kiosk"
        self.credential.device.save(update_fields=["mode"])
        self.assertEqual(self.redeem(offered["code"]).status_code, 403)
        self.client.cookies.pop("medframe_device")
        self.assertEqual(self.redeem(offered["code"]).status_code, 403)

    def test_anonymous_responsibility_code_never_impersonates_receiver(self):
        offered = self.offer()
        from medframe_apps.stations.models import ConsultationHandoff

        ConsultationHandoff.objects.filter(id=offered["id"]).update(
            kind="responsibility", recipient=self.admin
        )
        self.assertNotEqual(self.redeem(offered["code"]).status_code, 200)
        self.assertFalse(StationAccessSession.objects.exists())

    def test_same_patient_other_encounter_is_denied_and_assigned_write_works(self):
        other = care.create_encounter(
            self.doctor,
            self.organization.id,
            self.patient.id,
            self.provider.id,
            self.branch.id,
            "Another consultation",
            uuid4(),
        )
        self.assertEqual(self.redeem(self.offer()["code"]).status_code, 200)
        query = "query($org:UUID!,$id:UUID!){encounter(organizationId:$org,encounterId:$id){id}}"
        denied = self.graphql(query, {"org": str(self.organization.id), "id": str(other.id)})
        self.assertNotEqual(denied.status_code, 200)
        allowed = self.graphql(
            query, {"org": str(self.organization.id), "id": str(self.encounter.id)}
        )
        self.assertEqual(allowed.json()["data"]["encounter"]["id"], str(self.encounter.id))
        mutation = (
            "mutation($org:UUID!,$id:UUID!,$content:JSON!){updateEncounterDraft("
            "organizationId:$org,encounterId:$id,content:$content,expectedVersion:1){version}}"
        )
        saved = self.graphql(
            mutation,
            {"org": str(self.organization.id), "id": str(self.encounter.id), "content": {}},
        )
        self.assertEqual(saved.json()["data"]["updateEncounterDraft"]["version"], 2)

    def test_other_patient_alias_fragment_financial_and_admin_denied(self):
        self.assertEqual(self.redeem(self.offer()["code"]).status_code, 200)
        for query in [
            "query { alias:platformCapabilities }",
            "query { ...Restricted } fragment Restricted on Query { alias:platformCapabilities }",
        ]:
            self.assertEqual(self.graphql(query).status_code, 403)
        self.assertEqual(self.client.get("/admin/").status_code, 403)
        other = self.register()
        response = self.graphql(
            "query($org:UUID!,$id:UUID!){patientDemographics(organizationId:$org,patientId:$id){id}}",
            {"org": str(self.organization.id), "id": str(other.id)},
        )
        self.assertEqual(response.status_code, 403)

    def test_cookie_copy_without_approved_device_and_live_source_revocation_end_access(self):
        self.assertEqual(self.redeem(self.offer()["code"]).status_code, 200)
        copied = Client()
        copied.cookies["medframe_django_session"] = self.client.cookies[
            "medframe_django_session"
        ].value
        self.assertEqual(
            copied.post(
                "/stations/encounter",
                {},
                content_type="application/json",
                HTTP_ORIGIN="http://localhost:3000",
            ).status_code,
            403,
        )
        ClinicalSession.objects.filter(id=self.source.id).update(revoked=True)
        response = self.client.post(
            "/stations/encounter",
            {},
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(response.status_code, 403)

    def test_absolute_and_idle_expiry_require_new_code(self):
        self.assertEqual(self.redeem(self.offer()["code"]).status_code, 200)
        row = StationAccessSession.objects.get()
        ClinicalSession.objects.filter(id=row.session_id).update(
            last_seen_at=timezone.now() - timedelta(minutes=11)
        )
        self.assertEqual(self.graphql("query { currentUser { id } }").status_code, 403)

    def test_scoped_session_cannot_issue_another_handoff_or_change_settings(self):
        self.assertEqual(self.redeem(self.offer()["code"]).status_code, 200)
        response = self.client.post(
            "/stations/handoff",
            {"action": "offer"},
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(response.status_code, 403)
        response = self.client.post(
            "/auth/mfa/enroll",
            {},
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(response.status_code, 403)

    def test_end_session_keeps_device_pairing_and_source_account(self):
        self.assertEqual(self.redeem(self.offer()["code"]).status_code, 200)
        response = self.client.post(
            "/auth/logout", {}, content_type="application/json", HTTP_ORIGIN="http://localhost:3000"
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertEqual(self.client.cookies["medframe_device"].value, self.secret)
        self.source.refresh_from_db()
        self.assertFalse(self.source.revoked)

    def test_scope_bootstrap_allows_root_fields_without_arguments(self):
        self.assertEqual(self.redeem(self.offer()["code"]).status_code, 200)
        response = self.graphql("query { currentUser { id } myOrganizations { id name } }")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["data"]["currentUser"]["id"], str(self.doctor.id))
        self.assertEqual(len(response.json()["data"]["myOrganizations"]), 1)

    def test_revoked_patient_grant_ends_delegated_session(self):
        self.assertEqual(self.redeem(self.offer()["code"]).status_code, 200)
        self.patient.access_grants.update(active=False)
        self.assertEqual(self.graphql("query { currentUser { id } }").status_code, 403)

    def test_auth_epoch_and_absolute_expiry_end_code_access(self):
        from medframe_apps.accounts.models import User

        offered = self.offer()
        User.objects.filter(id=self.doctor.id).update(auth_epoch=2)
        self.assertEqual(self.redeem(offered["code"]).status_code, 403)
        self.doctor.refresh_from_db()
        offered = self.offer()
        self.assertEqual(self.redeem(offered["code"]).status_code, 200)
        StationAccessSession.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.graphql("query { currentUser { id } }").status_code, 403)
