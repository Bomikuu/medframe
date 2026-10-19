import json
import time
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pyotp
from django.conf import settings
from django.test import Client
from django.utils import timezone

from config.crypto import cipher
from medframe_apps.accounts.models import ClinicalSession, GoogleIdentity, MfaCredential
from medframe_apps.portal.models import PortalInvitation, PortalLink
from tests_django import test_boundaries as fixtures


class LoginEnhancementTests(fixtures.ClinicalFixture):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True, REMOTE_ADDR="198.18.0.54")
        self.secret = pyotp.random_base32()
        MfaCredential.objects.create(
            user=self.doctor,
            encrypted_secret=cipher().encrypt(self.secret.encode()).decode(),
            confirmed=True,
        )
        self.google_settings = patch(
            "medframe_apps.accounts.google_signin.get_settings",
            return_value=SimpleNamespace(google_client_id="synthetic.apps.googleusercontent.com"),
        )
        self.google_settings.start()
        self.addCleanup(self.google_settings.stop)

    def post(self, path, data):
        csrf = self.client.get("/auth/csrf", HTTP_ORIGIN=settings.WEB_ORIGIN).json()["csrfToken"]
        return self.client.post(
            path,
            json.dumps(data),
            content_type="application/json",
            HTTP_ORIGIN=settings.WEB_ORIGIN,
            HTTP_X_CSRF_TOKEN=csrf,
        )

    def password_login(self, remember=False):
        return self.post(
            "/auth/login",
            {
                "email": self.doctor.email,
                "password": "Synthetic test password 91",
                "remember": remember,
            },
        )

    def claims(self, prefix="/auth", **overrides):
        nonce = self.post(f"{prefix}/google/prepare", {}).json()["nonce"]
        return {
            "sub": "synthetic-google-subject",
            "email": self.doctor.email,
            "email_verified": True,
            "nonce": nonce,
            **overrides,
        }

    def google_login(self, claims, prefix="/auth", remember=False):
        with patch("medframe_apps.accounts.google_signin.verify_credential", return_value=claims):
            return self.post(
                f"{prefix}/google/login", {"credential": "synthetic-token", "remember": remember}
            )

    def verify(self):
        return self.post("/auth/mfa/verify", {"code": pyotp.TOTP(self.secret).now()})

    def test_unchecked_session_ends_with_browser_and_has_eight_hour_server_limit(self):
        self.assertEqual(self.password_login().status_code, 200)
        self.assertEqual(self.verify().status_code, 200)
        cookie = self.client.cookies[settings.SESSION_COOKIE_NAME]
        self.assertEqual(cookie["max-age"], "")
        self.assertEqual(cookie["expires"], "")
        session = ClinicalSession.objects.get(user=self.doctor)
        self.assertAlmostEqual(
            (session.expires_at - timezone.now()).total_seconds(), 28800, delta=5
        )

    def test_remember_survives_challenge_and_preserves_idle_timeout_and_logout(self):
        self.assertEqual(self.password_login(True).status_code, 200)
        self.assertEqual(self.verify().status_code, 200)
        cookie = self.client.cookies[settings.SESSION_COOKIE_NAME]
        self.assertEqual(cookie["max-age"], 30 * 86400)
        self.assertTrue(cookie["httponly"])
        ClinicalSession.objects.filter(user=self.doctor).update(
            last_seen_at=timezone.now() - timedelta(minutes=31)
        )
        response = self.post("/graphql", {"query": "{ currentUser { id } }"})
        self.assertEqual(response.status_code, 401)

    def test_remember_requires_boolean(self):
        self.assertEqual(self.password_login("false").status_code, 400)

    def test_google_disabled_has_no_nonce(self):
        with patch(
            "medframe_apps.accounts.google_signin.get_settings",
            return_value=SimpleNamespace(google_client_id=""),
        ):
            self.assertEqual(self.post("/auth/google/prepare", {}).json(), {"enabled": False})
            self.assertEqual(
                self.post("/auth/google/login", {"credential": "token"}).status_code, 503
            )

    def test_google_needs_csrf_and_correct_origin(self):
        for path in ["/auth/google/prepare", "/auth/google/login"]:
            response = self.client.post(
                path, "{}", content_type="application/json", HTTP_ORIGIN=settings.WEB_ORIGIN
            )
            self.assertEqual(response.status_code, 403)

    def test_google_connects_only_after_mfa_and_keeps_remember_choice(self):
        claims = self.claims()
        self.assertEqual(self.google_login(claims, remember=True).status_code, 200)
        self.assertFalse(GoogleIdentity.objects.exists())
        self.assertEqual(
            self.post("/graphql", {"query": "{ currentUser { id } }"}).status_code, 401
        )
        self.assertEqual(self.verify().status_code, 200)
        self.assertEqual(GoogleIdentity.objects.get().subject, claims["sub"])
        self.assertEqual(self.client.cookies[settings.SESSION_COOKIE_NAME]["max-age"], 30 * 86400)
        self.post("/auth/logout", {})
        self.assertTrue(ClinicalSession.objects.get(user=self.doctor).revoked)

    def test_google_invalid_nonce_and_unverified_email_rejected(self):
        for overrides in [{"nonce": "wrong"}, {"email_verified": False}]:
            with self.subTest(overrides=overrides):
                self.assertEqual(self.google_login(self.claims(**overrides)).status_code, 401)
        self.assertFalse(GoogleIdentity.objects.exists())

    def test_google_requires_unexpired_nonce_and_cannot_replay(self):
        claims = self.claims()
        session = self.client.session
        session["google_nonce_staff"] = {"value": claims["nonce"], "expires": time.time() - 1}
        session.save()
        self.assertEqual(self.google_login(claims).status_code, 401)
        claims = self.claims()
        self.assertEqual(self.google_login(claims).status_code, 200)
        self.assertEqual(self.google_login(claims).status_code, 401)

    def test_google_unknown_email_does_not_create_account(self):
        count = fixtures.User.objects.count()
        self.assertEqual(
            self.google_login(self.claims(email="unknown@synthetic.example")).status_code, 401
        )
        self.assertEqual(fixtures.User.objects.count(), count)

    def test_google_requires_existing_enrolled_authenticator(self):
        MfaCredential.objects.filter(user=self.doctor).update(confirmed=False)
        self.assertEqual(self.google_login(self.claims()).status_code, 401)

    def test_google_stable_subject_keeps_original_account_after_email_change(self):
        GoogleIdentity.objects.create(user=self.doctor, subject="synthetic-google-subject")
        self.assertEqual(
            self.google_login(self.claims(email="changed@synthetic.example")).status_code, 200
        )
        self.assertEqual(self.client.session["challenge_user"], str(self.doctor.id))

    def test_google_cannot_replace_existing_connection(self):
        GoogleIdentity.objects.create(user=self.doctor, subject="original-subject")
        self.assertEqual(self.google_login(self.claims()).status_code, 401)

    def test_google_rechecks_membership_before_mfa_completion(self):
        self.assertEqual(self.google_login(self.claims()).status_code, 200)
        self.membership.active = False
        self.membership.save()
        self.assertEqual(self.verify().status_code, 403)
        self.assertFalse(GoogleIdentity.objects.exists())

    def test_google_patient_realm_does_not_accept_staff_only_membership(self):
        claims = self.claims(prefix="/portal/auth")
        self.assertEqual(self.google_login(claims, prefix="/portal/auth").status_code, 401)

    def test_google_patient_nonce_cannot_be_used_for_staff(self):
        claims = self.claims(prefix="/portal/auth")
        self.assertEqual(self.google_login(claims).status_code, 401)

    def test_google_verified_patient_stays_in_patient_realm(self):
        patient = self.register()
        invitation = PortalInvitation.objects.create(
            organization=self.organization,
            patient=patient,
            issued_by=self.doctor,
            email=self.doctor.email,
            relationship="self",
            method="in_person",
            token_hash="7" * 64,
            expires_at=timezone.now() + timedelta(days=1),
            consumed_at=timezone.now(),
        )
        PortalLink.objects.create(
            organization=self.organization,
            patient=patient,
            user=self.doctor,
            invitation=invitation,
            relationship="self",
        )
        claims = self.claims(prefix="/portal/auth")
        self.assertEqual(
            self.google_login(claims, prefix="/portal/auth", remember=True).status_code, 200
        )
        self.assertEqual(
            self.post("/auth/mfa/verify", {"code": pyotp.TOTP(self.secret).now()}).status_code,
            403,
        )
        self.assertEqual(
            self.post(
                "/portal/auth/mfa/verify", {"code": pyotp.TOTP(self.secret).now()}
            ).status_code,
            200,
        )
        self.assertEqual(self.client.session["auth_realm"], "patient")
        self.assertEqual(
            self.post("/graphql", {"query": "{ currentUser { id } }"}).status_code, 403
        )

    def test_google_invalid_signed_token_is_not_a_challenge(self):
        self.claims()
        with patch(
            "medframe_apps.accounts.google_signin.verify_oauth2_token",
            side_effect=ValueError("Synthetic invalid signature"),
        ):
            self.assertEqual(
                self.post("/auth/google/login", {"credential": "invalid"}).status_code, 401
            )
        self.assertNotIn("challenge_user", self.client.session)
