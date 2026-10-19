import json
from urllib.parse import parse_qs, urlparse

import pyotp

from config.errors import DomainError
from medframe_apps.accounts import services
from medframe_apps.accounts.models import User
from medframe_apps.onboarding.accounts import begin_account
from medframe_apps.onboarding.views import verify_mfa
from tests_django.onboarding_fixture import OnboardingFixture


class AccountTests(OnboardingFixture):
    def test_native_account_mfa_binds_draft_without_membership(self):
        request, _ = self.verified()
        begin_account(
            request,
            {
                "first_name": "Synthetic",
                "last_name": "Owner",
                "password": "Synthetic onboarding password 907!",
                "confirm": "Synthetic onboarding password 907!",
                "mode": "new",
                "terms": True,
                "privacy": True,
            },
        )
        uri = services.enroll(request)
        secret = parse_qs(urlparse(uri).query)["secret"][0]
        request._body = json.dumps({"code": pyotp.TOTP(secret).now()}).encode()
        response = verify_mfa(request)
        self.assertEqual(response.status_code, 200)
        state = json.loads(response.content)["snapshot"]
        self.assertTrue(state["account_ready"])
        user = User.objects.get(email=state["email"])
        self.assertFalse(user.is_staff)
        self.assertFalse(user.membership_set.exists())
        self.assertTrue(request.session["mfa_verified"])
        self.assertEqual(len(json.loads(response.content)["recoveryCodes"]), 10)

    def test_wrong_existing_password_never_resets_account(self):
        request, state = self.verified()
        user = User.objects.create_user(state["email"], "Original synthetic password 85!")
        original = user.password
        with self.assertRaises(DomainError):
            begin_account(
                request,
                {
                    "password": "Wrong synthetic password 85!",
                    "mode": "existing",
                    "terms": True,
                    "privacy": True,
                },
            )
        user.refresh_from_db()
        self.assertEqual(user.password, original)
