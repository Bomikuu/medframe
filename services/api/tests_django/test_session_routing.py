"""Existing browser sessions resolve to their own realm and permitted surface."""

import json
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

from django.test import Client, RequestFactory
from django.utils import timezone

from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.accounts.session_routing import session_route
from medframe_apps.stations.context import DEVICE_COOKIE, digest
from medframe_apps.stations.models import DeviceCredential, StationDevice
from tests_django.test_boundaries import ClinicalFixture


class SessionRoutingTests(ClinicalFixture):
    def browser(self, realm="staff", mfa=True):
        client = Client()
        client.force_login(self.admin)
        session = client.session
        session["mfa_verified"] = mfa
        session["auth_realm"] = realm
        session.save()
        ClinicalSession.objects.create(
            user=self.admin,
            realm=realm,
            session_key=session.session_key,
            last_seen_at=timezone.now(),
            expires_at=timezone.now() + timedelta(hours=1),
        )
        return client

    def pair(self, client, mode="kiosk"):
        device = StationDevice.objects.create(
            name="Synthetic route device",
            organization=self.organization,
            branch=self.branch,
            mode=mode,
            state="active",
            functions=["walk_in"] if mode == "kiosk" else ["clinical.read"],
            created_by=self.admin,
        )
        secret = str(uuid4())
        credential = DeviceCredential.objects.create(
            device=device,
            digest=digest(secret),
            verification_phrase="ABC234",
            expires_at=timezone.now() + timedelta(days=1),
        )
        client.cookies[DEVICE_COOKIE] = secret
        return credential

    def test_anonymous_and_stale_session_are_not_staff(self):
        client = Client()
        client.cookies["medframe_django_session"] = "stale-browser-session"
        response = client.get("/auth/session")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(), {"authenticated": False, "kind": "anonymous", "destination": "/login"}
        )
        self.assertIn("no-store", response["Cache-Control"])

    def test_verified_staff_resolves_to_clinic(self):
        response = self.browser().get("/auth/session").json()
        self.assertTrue(response["authenticated"])
        self.assertEqual(response["destination"], "/clinic")
        self.assertNotIn("user", response)

    def test_patient_resolves_to_portal_without_staff_access(self):
        client = self.browser("patient")
        self.assertEqual(client.get("/auth/session").json()["destination"], "/portal")
        response = client.post(
            "/graphql",
            json.dumps({"query": "{ currentUser { id } }"}),
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(response.status_code, 403)

    def test_unverified_mfa_and_revoked_native_session_do_not_redirect_as_signed_in(self):
        client = self.browser(mfa=False)
        self.assertFalse(client.get("/auth/session").json()["authenticated"])
        client = self.browser()
        ClinicalSession.objects.filter(session_key=client.session.session_key).update(revoked=True)
        self.assertFalse(client.get("/auth/session").json()["authenticated"])

    def test_signed_in_kiosk_browser_resolves_to_kiosk_and_cannot_read_clinical_graphql(self):
        client = self.browser()
        self.pair(client)
        self.assertEqual(client.get("/auth/session").json()["destination"], "/station/kiosk")
        response = client.post(
            "/graphql",
            json.dumps({"query": "{ currentUser { id } }"}),
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(response.status_code, 403)

    def test_revoked_device_routes_to_station_recovery(self):
        client = self.browser()
        credential = self.pair(client)
        credential.revoked = True
        credential.save(update_fields=["revoked"])
        self.assertEqual(client.get("/auth/session").json()["destination"], "/station")

    def test_explicit_browser_recovery_signs_out_and_detaches_without_revoking_device(self):
        client = self.browser()
        key = client.session.session_key
        credential = self.pair(client)
        response = client.post(
            "/auth/logout",
            json.dumps({"clear_device": True}),
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.cookies[DEVICE_COOKIE]["max-age"], 0)
        self.assertTrue(ClinicalSession.objects.get(session_key=key).revoked)
        credential.refresh_from_db()
        self.assertFalse(credential.revoked)
        self.assertEqual(credential.device.state, "active")

    def test_ordinary_logout_keeps_pairing_cookie_contract(self):
        client = self.browser()
        self.pair(client)
        response = client.post("/auth/logout", HTTP_ORIGIN="http://localhost:3000")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(DEVICE_COOKIE, response.cookies)

    def test_scoped_navigation_hints_keep_doctor_organization_and_exact_encounter(self):
        request = RequestFactory().get("/auth/session")
        request.user = self.admin
        request.session = {"mfa_verified": True, "auth_realm": "staff"}
        request.station_doctor = SimpleNamespace(
            code=SimpleNamespace(organization_id=self.organization.id)
        )
        value = json.loads(session_route(request).content)
        self.assertEqual(
            value["destination"], f"/station/clinician?organization={self.organization.id}"
        )
        request.station_doctor = None
        encounter_id = uuid4()
        request.station_access = SimpleNamespace(
            handoff=SimpleNamespace(
                encounter=SimpleNamespace(id=encounter_id, organization_id=self.organization.id)
            )
        )
        value = json.loads(session_route(request).content)
        self.assertEqual(
            value["destination"],
            f"/station/clinician/consultations/{encounter_id}?organization={self.organization.id}",
        )
