import json
import uuid

from django.contrib.auth.models import AnonymousUser
from django.contrib.sessions.backends.db import SessionStore
from django.test import RequestFactory, TestCase

from config.crypto import cipher
from medframe_apps.accounts.models import MailOutbox, User
from medframe_apps.onboarding.invitations import issue_invitation
from medframe_apps.onboarding.verification import (
    exchange_invitation,
    request_email_code,
    verify_email,
)


class OnboardingFixture(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.platform = User.objects.create_superuser(
            "platform-onboarding@example.test", "Synthetic onboarding password 907!"
        )

    def request(self, user=None):
        request = RequestFactory().post(
            "/onboarding/graphql",
            "{}",
            content_type="application/json",
            REMOTE_ADDR="198.18." + str(uuid.uuid4().int % 250) + "." + str(uuid.uuid4().int % 250),
        )
        request.user = user or AnonymousUser()
        request.session = SessionStore()
        request.session.create()
        if user:
            request.session["mfa_verified"] = True
            request.session["auth_realm"] = "staff"
        return request

    def invited(self):
        result = issue_invitation(
            self.request(self.platform),
            {"email": f"clinic-{uuid.uuid4().hex}@example.test", "clinic_name": "Synthetic Clinic"},
            uuid.uuid4(),
        )
        mail = MailOutbox.objects.get(kind="clinic_invitation", encrypted_payload__isnull=False)
        payload = json.loads(cipher().decrypt(mail.encrypted_payload.encode()))
        return result, payload["link"].rsplit("/", 1)[1]

    def verified(self):
        result, token = self.invited()
        request = self.request()
        exchange_invitation(request, token)
        request_email_code(request)
        mail = MailOutbox.objects.filter(kind="clinic_email_code").latest("created_at")
        code = json.loads(cipher().decrypt(mail.encrypted_payload.encode()))["code"]
        snapshot = verify_email(request, code)
        return request, snapshot
