import uuid
from datetime import timedelta

from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import User
from medframe_apps.onboarding.invitations import issue_invitation, manage_invitation
from medframe_apps.onboarding.models import ClinicInvitation
from medframe_apps.onboarding.policy import invitation_state, require_platform_admin
from medframe_apps.onboarding.verification import exchange_invitation
from tests_django.onboarding_fixture import OnboardingFixture


class InvitationTests(OnboardingFixture):
    def test_platform_permission_not_is_staff(self):
        user = User.objects.create_user("ordinary@example.test", is_staff=True)
        with self.assertRaises(DomainError):
            require_platform_admin(self.request(user))
        with self.assertRaises(DomainError):
            require_platform_admin(self.request())

    def test_token_digest_and_resend_invalidation(self):
        row, token = self.invited()
        invitation = ClinicInvitation.objects.get(id=row["id"])
        self.assertNotEqual(invitation.token_hash, token)
        self.assertGreaterEqual(len(token), 40)
        self.assertNotIn("token", row)
        manage_invitation(self.request(self.platform), invitation.id, invitation.version, "resend")
        with self.assertRaises(DomainError):
            exchange_invitation(self.request(), token)

    def test_expiry_and_revocation_are_checked_live(self):
        row, token = self.invited()
        invitation = ClinicInvitation.objects.get(id=row["id"])
        invitation.expires_at = timezone.now() - timedelta(seconds=1)
        invitation.save()
        self.assertEqual(invitation_state(invitation), "expired")
        request = self.request()
        exchange_invitation(request, token)
        from medframe_apps.onboarding.verification import request_email_code

        with self.assertRaises(DomainError):
            request_email_code(request)

    def test_request_id_is_idempotent_and_bound_to_email(self):
        key = uuid.uuid4()
        first = issue_invitation(self.request(self.platform), {"email": "stable@example.test"}, key)
        self.assertEqual(
            first,
            issue_invitation(self.request(self.platform), {"email": "stable@example.test"}, key),
        )
        with self.assertRaises(DomainError):
            issue_invitation(self.request(self.platform), {"email": "other@example.test"}, key)
