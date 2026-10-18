from datetime import timedelta
from uuid import uuid4

from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import User
from medframe_apps.portal.invitations import issue_invitation, prepare_invitation, revoke_access
from medframe_apps.portal.models import PortalLink
from tests_django import test_portal_invitations
from tests_django.test_boundaries import ClinicalFixture


class InvitationSafetyTests(ClinicalFixture):
    invite = test_portal_invitations.PortalInvitationTests.invite
    request = test_portal_invitations.PortalInvitationTests.request

    def test_existing_account_wrong_password_cannot_change_password_or_mfa(self):
        _, invite, token = self.invite()
        user = User.objects.create_user(invite.email, "Synthetic existing password 97")
        password_hash = user.password
        with self.assertRaises(DomainError):
            prepare_invitation(self.request(), token, "Wrong synthetic password 98", "Changed name")
        user.refresh_from_db()
        self.assertEqual(user.password, password_hash)
        self.assertEqual(user.display_name, "")
        self.assertFalse(PortalLink.objects.filter(user=user).exists())

    def test_expiry_revocation_and_reissue_deny_previous_claim(self):
        patient, invite, token = self.invite()
        from unittest.mock import patch

        with (
            patch(
                "medframe_apps.portal.invitations.timezone.now",
                return_value=timezone.now() + timedelta(hours=25),
            ),
            self.assertRaises(DomainError),
        ):
            prepare_invitation(self.request(), token, "Synthetic patient password 95!", "Synthetic")
        newer = issue_invitation(
            self.doctor,
            self.organization.id,
            patient.id,
            {
                "email": invite.email,
                "relationship": "self",
                "method": "in_person",
                "attested": True,
            },
            uuid4(),
        )
        invite.refresh_from_db()
        self.assertIsNotNone(invite.revoked_at)
        revoke_access(
            self.doctor,
            self.organization.id,
            newer.id,
            kind="invitation",
            reason="Synthetic cancellation",
        )
        newer.refresh_from_db()
        self.assertIsNotNone(newer.revoked_at)

    def test_matching_patient_email_and_guardian_fields_create_no_authority(self):
        patient = self.register()
        patient.email = self.doctor.email
        patient.guardian_name = self.doctor.display_name
        patient.save()
        self.assertFalse(PortalLink.objects.filter(patient=patient).exists())
        patient.access_grants.update(active=False)
        with self.assertRaises(DomainError):
            issue_invitation(
                self.doctor,
                self.organization.id,
                patient.id,
                {
                    "email": self.doctor.email,
                    "relationship": "self",
                    "method": "in_person",
                    "attested": True,
                },
                uuid4(),
            )

    def test_verified_guardian_is_bound_to_explicit_patient(self):
        patient = self.register()
        invitation = issue_invitation(
            self.doctor,
            self.organization.id,
            patient.id,
            {
                "email": self.doctor.email,
                "relationship": "guardian",
                "method": "verified_guardian_authority",
                "attested": True,
            },
            uuid4(),
        )
        self.assertEqual(invitation.patient_id, patient.id)
        self.assertEqual(invitation.relationship, "guardian")
        self.assertFalse(PortalLink.objects.exists())

    def test_reissuing_self_invitation_to_corrected_email_revokes_previous_token(self):
        patient, earlier, token = self.invite()
        issue_invitation(
            self.doctor,
            self.organization.id,
            patient.id,
            {
                "email": "corrected-portal@example.org",
                "relationship": "self",
                "method": "in_person",
                "attested": True,
            },
            uuid4(),
        )
        earlier.refresh_from_db()
        self.assertIsNotNone(earlier.revoked_at)
        with self.assertRaises(DomainError):
            prepare_invitation(self.request(), token, "Synthetic patient password 95!", "Synthetic")
