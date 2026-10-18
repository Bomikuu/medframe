import json
from datetime import timedelta

from django.conf import settings
from django.test import Client, RequestFactory
from django.utils import timezone

from config.admin import site
from config.errors import DomainError
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.accounts.services import begin_login, challenge_user
from tests_django.test_boundaries import ClinicalFixture


class SessionRealmTests(ClinicalFixture):
    def authenticated(self, realm=None):
        client = Client()
        client.force_login(self.doctor)
        session = client.session
        session["mfa_verified"] = True
        if realm is not None:
            session["auth_realm"] = realm
        session.save()
        ClinicalSession.objects.create(
            user=self.doctor,
            session_key=session.session_key,
            realm=realm or "staff",
            last_seen_at=timezone.now(),
            expires_at=timezone.now() + timedelta(hours=8),
        )
        return client

    def graphql(self, client):
        return client.post(
            "/graphql",
            json.dumps({"query": "{ currentUser { id } }"}),
            content_type="application/json",
            HTTP_ORIGIN=settings.WEB_ORIGIN,
        )

    def test_patient_realm_rejected_by_staff_graphql_files_and_admin(self):
        client = self.authenticated("patient")
        self.assertEqual(self.graphql(client).status_code, 403)
        self.assertEqual(client.get("/documents/download").status_code, 403)
        self.assertEqual(
            client.post(
                "/documents/upload/00000000-0000-0000-0000-000000000001",
                HTTP_ORIGIN=settings.WEB_ORIGIN,
            ).status_code,
            403,
        )
        request = RequestFactory().get("/admin/")
        request.user = self.admin
        request.session = {"mfa_verified": True, "auth_realm": "patient"}
        self.assertFalse(site.has_permission(request))

    def test_existing_staff_session_remains_staff_only(self):
        client = self.authenticated()
        self.assertEqual(self.graphql(client).status_code, 200)

    def test_forged_registry_realm_is_denied(self):
        client = self.authenticated("staff")
        session = client.session
        session["auth_realm"] = "patient"
        session.save()
        self.assertEqual(self.graphql(client).status_code, 401)

    def test_staff_challenge_cannot_complete_as_patient(self):
        client = Client()
        session = client.session
        request = RequestFactory().post("/auth/login")
        request.session = session
        begin_login(request, self.doctor.email, "Synthetic test password 91")
        with self.assertRaises(DomainError):
            challenge_user(request, realm="patient")

    def test_switch_rotates_and_revokes_old_registry(self):
        client = self.authenticated("patient")
        old_key = client.session.session_key
        request = RequestFactory().post("/auth/login")
        request.session = client.session
        begin_login(request, self.doctor.email, "Synthetic test password 91")
        self.assertNotEqual(old_key, request.session.session_key)
        self.assertTrue(ClinicalSession.objects.get(session_key=old_key).revoked)
        self.assertEqual(request.session["challenge_realm"], "staff")

    def test_reset_revokes_both_realms(self):
        from config.crypto import digest
        from medframe_apps.accounts.models import PasswordReset
        from medframe_apps.accounts.services import reset_password

        self.authenticated("patient")
        self.authenticated("staff")
        PasswordReset.objects.create(
            user=self.doctor,
            token_hash=digest("synthetic-reset-both"),
            realm="patient",
            expires_at=timezone.now() + timedelta(minutes=15),
        )
        with self.assertRaises(DomainError):
            reset_password("synthetic-reset-both", "Synthetic changed password 98")
        reset_password("synthetic-reset-both", "Synthetic changed password 98", realm="patient")
        self.assertFalse(ClinicalSession.objects.filter(user=self.doctor, revoked=False).exists())
