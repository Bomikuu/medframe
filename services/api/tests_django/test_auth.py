import json
from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

import pyotp
from django.conf import settings
from django.test import Client, RequestFactory
from django.utils import timezone

from config.admin import site
from config.crypto import digest
from medframe_apps.accounts.models import ClinicalSession, MfaCredential, PasswordReset
from medframe_apps.accounts.services import reset_password
from tests_django.test_boundaries import ClinicalFixture


class DjangoAuthenticationTests(ClinicalFixture):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True, REMOTE_ADDR="198.18.0.20")

    def post(self, path, data):
        csrf = self.client.get("/auth/csrf", HTTP_ORIGIN=settings.WEB_ORIGIN).json()["csrfToken"]
        return self.client.post(
            path,
            json.dumps(data),
            content_type="application/json",
            HTTP_ORIGIN=settings.WEB_ORIGIN,
            HTTP_X_CSRF_TOKEN=csrf,
        )

    def sign_in(self):
        response = self.post(
            "/auth/login", {"email": self.doctor.email, "password": "Synthetic test password 91"}
        )
        self.assertEqual(response.status_code, 200)
        uri = self.post("/auth/mfa/enroll", {}).json()["otpauthUri"]
        secret = parse_qs(urlsplit(uri).query)["secret"][0]
        response = self.post("/auth/mfa/verify", {"code": pyotp.TOTP(secret).now()})
        self.assertEqual(response.status_code, 200)
        return secret, response.json()["recoveryCodes"]

    def test_http_complete_mfa_graphql_logout_journey(self):
        _, codes = self.sign_in()
        self.assertEqual(len(codes), 10)
        response = self.post("/graphql", {"query": "{ currentUser { id displayName } }"})
        self.assertEqual(response.json()["data"]["currentUser"]["id"], str(self.doctor.id))
        self.assertEqual(self.post("/auth/logout", {}).status_code, 200)
        self.assertEqual(
            self.post("/graphql", {"query": "{ currentUser { id } }"}).status_code, 401
        )

    def test_challenge_cannot_open_workspace_and_rotates(self):
        self.post(
            "/auth/login", {"email": self.doctor.email, "password": "Synthetic test password 91"}
        )
        initial = self.client.cookies[settings.SESSION_COOKIE_NAME].value
        self.assertEqual(
            self.post("/graphql", {"query": "{ currentUser { id } }"}).status_code, 401
        )
        uri = self.post("/auth/mfa/enroll", {}).json()["otpauthUri"]
        secret = parse_qs(urlsplit(uri).query)["secret"][0]
        self.post("/auth/mfa/verify", {"code": pyotp.TOTP(secret).now()})
        self.assertNotEqual(initial, self.client.cookies[settings.SESSION_COOKIE_NAME].value)

    def test_native_csrf_and_origin_are_required(self):
        data = {"email": self.doctor.email, "password": "PRIVATE-SUBMITTED-VALUE"}
        for headers in [
            {"HTTP_ORIGIN": settings.WEB_ORIGIN},
            {"HTTP_ORIGIN": "https://foreign.example"},
        ]:
            response = self.client.post(
                "/auth/login", json.dumps(data), content_type="application/json", **headers
            )
            self.assertEqual(response.status_code, 403)
            self.assertNotIn(data["password"], response.content.decode())

    def test_inactive_or_revoked_sessions_fail(self):
        self.sign_in()
        ClinicalSession.objects.filter(user=self.doctor).update(revoked=True)
        self.assertEqual(
            self.post("/graphql", {"query": "{ currentUser { id } }"}).status_code, 401
        )

    def test_inactivity_and_absolute_expiry(self):
        for field, value in [
            ("last_seen_at", timezone.now() - timedelta(minutes=31)),
            ("expires_at", timezone.now() - timedelta(seconds=1)),
        ]:
            self.sign_in()
            ClinicalSession.objects.filter(user=self.doctor).update(**{field: value})
            self.assertEqual(
                self.post("/graphql", {"query": "{ currentUser { id } }"}).status_code, 401
            )
            MfaCredential.objects.filter(user=self.doctor).delete()

    def test_password_reset_preserves_mfa_and_revokes_session(self):
        self.sign_in()
        original = MfaCredential.objects.get(user=self.doctor).encrypted_secret
        PasswordReset.objects.create(
            user=self.doctor,
            token_hash=digest("synthetic-token"),
            expires_at=timezone.now() + timedelta(minutes=15),
        )
        reset_password("synthetic-token", "New synthetic password 94")
        self.assertEqual(original, MfaCredential.objects.get(user=self.doctor).encrypted_secret)
        self.assertEqual(
            self.post("/graphql", {"query": "{ currentUser { id } }"}).status_code, 401
        )

    def test_admin_login_requires_mfa(self):
        response = self.client.post(
            "/admin/login/",
            {"username": self.admin.email, "password": "Synthetic test password 92"},
            HTTP_ORIGIN=settings.WEB_ORIGIN,
        )
        self.assertIn(response.status_code, [302, 403])
        request = RequestFactory().get("/admin/")
        request.user = self.admin
        request.session = {}
        self.assertFalse(site.has_permission(request))

    def test_admin_same_origin_keeps_native_csrf_without_widening_api_origins(self):
        csrf = self.client.get("/auth/csrf", HTTP_ORIGIN=settings.WEB_ORIGIN).json()["csrfToken"]
        headers = {"HTTP_ORIGIN": "http://testserver", "HTTP_X_CSRF_TOKEN": csrf}
        self.assertEqual(self.client.post("/admin/login/", {}, **headers).status_code, 302)
        self.assertEqual(
            self.client.post("/admin/login/", {}, HTTP_ORIGIN="http://testserver").status_code,
            403,
        )
        self.assertEqual(self.client.post("/auth/login", {}, **headers).status_code, 403)

    def test_graphql_errors_are_safe_and_bounded(self):
        self.sign_in()
        response = self.post(
            "/graphql",
            {
                "query": 'mutation { registerPatient(organizationId: "not-uuid", '
                'data: { fullName: "SENSITIVE-NAME", branchId: "bad", '
                'requestId: "bad" }) { id } }'
            },
        )
        self.assertNotIn("SENSITIVE-NAME", response.content.decode())
        response = self.post(
            "/graphql", {"query": "{ currentUser { id } }", "variables": {"oversized": "x" * 65536}}
        )
        self.assertEqual(response.status_code, 413)
