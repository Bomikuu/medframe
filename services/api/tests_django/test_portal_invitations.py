import json
from uuid import uuid4

import pyotp
from django.contrib.sessions.middleware import SessionMiddleware
from django.test import RequestFactory

from config.crypto import cipher
from config.errors import DomainError
from medframe_apps.accounts.models import MailOutbox, MfaCredential, User
from medframe_apps.accounts.services import enroll, verify_mfa
from medframe_apps.portal.invitations import PortalActivation, issue_invitation, prepare_invitation
from medframe_apps.portal.models import PortalLink
from tests_django.test_boundaries import ClinicalFixture


class PortalInvitationTests(ClinicalFixture):
    def invite(self, relationship="self"):
        patient = self.register()
        invite = issue_invitation(
            self.doctor,
            self.organization.id,
            patient.id,
            {
                "email": "synthetic-portal@example.test",
                "relationship": relationship,
                "method": "in_person",
                "note": "Synthetic identity verified",
                "attested": True,
            },
            uuid4(),
        )
        payload = json.loads(
            cipher().decrypt(MailOutbox.objects.latest("created_at").encrypted_payload.encode())
        )
        token = payload["link"].split("#token=")[1]
        return patient, invite, token

    def request(self):
        request = RequestFactory().post("/portal/auth/invitations/prepare")
        SessionMiddleware(lambda request: None).process_request(request)
        request.session.save()
        return request

    def test_verified_claim_requires_native_mfa_and_creates_no_membership(self):
        patient, invite, token = self.invite()
        request = self.request()
        self.assertEqual(
            prepare_invitation(
                request, token, "Synthetic patient password 95!", "Synthetic Patient"
            ),
            "enroll",
        )
        self.assertNotIn(token, str(dict(request.session)))
        self.assertFalse(PortalLink.objects.exists())
        enroll(request, realm="patient")
        user = User.objects.get(email=invite.email)
        credential = MfaCredential.objects.get(user=user)
        with self.assertRaises(DomainError):
            verify_mfa(request, "invalid", realm="patient", activation=PortalActivation())
        self.assertFalse(PortalLink.objects.exists())
        secret = cipher().decrypt(credential.encrypted_secret.encode()).decode()
        codes = verify_mfa(
            request, pyotp.TOTP(secret).now(), realm="patient", activation=PortalActivation()
        )
        self.assertEqual(len(codes), 10)
        self.assertEqual(PortalLink.objects.get(user=user).patient_id, patient.id)
        self.assertFalse(user.membership_set.exists())
        invite.refresh_from_db()
        self.assertIsNotNone(invite.consumed_at)
        self.assertEqual(request.session["auth_realm"], "patient")

    def test_guardian_authority_and_attestation_are_required(self):
        with self.assertRaises(DomainError):
            self.invite("guardian")
        patient = self.register()
        with self.assertRaises(DomainError):
            issue_invitation(
                self.doctor,
                self.organization.id,
                patient.id,
                {
                    "email": "synthetic@example.test",
                    "relationship": "self",
                    "method": "in_person",
                    "attested": False,
                },
                uuid4(),
            )
