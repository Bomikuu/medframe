from datetime import timedelta

from django.utils import timezone

from config.errors import DomainError
from medframe_apps.onboarding.invitations import manage_invitation
from medframe_apps.onboarding.models import OnboardingVerification
from medframe_apps.onboarding.verification import bind_proof, require_onboarding
from tests_django.onboarding_fixture import OnboardingFixture


class VerificationTests(OnboardingFixture):
    def test_proof_is_session_bound_and_expiring(self):
        request, _ = self.verified()
        proof = OnboardingVerification.objects.get(id=request.session["onboarding_proof"])
        other = self.request()
        other.session["onboarding_proof"] = str(proof.id)
        with self.assertRaises(DomainError):
            require_onboarding(other)
        proof.proof_expires = timezone.now() - timedelta(seconds=1)
        proof.save()
        with self.assertRaises(DomainError):
            require_onboarding(request)

    def test_revocation_invalidates_verified_draft(self):
        request, _ = self.verified()
        draft = require_onboarding(request)
        manage_invitation(self.request(self.platform), draft.invitation_id, 1, "revoke")
        with self.assertRaises(DomainError):
            require_onboarding(request)

    def test_original_link_and_new_proof_restore_server_draft(self):
        request, snapshot = self.verified()
        proof = OnboardingVerification.objects.get(id=request.session["onboarding_proof"])
        second = self.request()
        # Rebinding here represents the same recipient after fresh verification.
        bind_proof(second, proof)
        self.assertEqual(str(require_onboarding(second).id), snapshot["id"])
        with self.assertRaises(DomainError):
            require_onboarding(request)
