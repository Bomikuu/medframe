import uuid
from unittest.mock import patch

from config.errors import DomainError
from medframe_apps.accounts.models import User
from medframe_apps.onboarding.completion import complete_onboarding
from medframe_apps.onboarding.models import ClinicOnboarding, MedicalSpecialty, OnboardingConsent
from medframe_apps.onboarding.validation import NOTICE_VERSION
from medframe_apps.organizations.models import Organization
from medframe_apps.providers.models import ProviderProfile
from tests_django.onboarding_fixture import OnboardingFixture


class CompletionTests(OnboardingFixture):
    def ready(self):
        request, state = self.verified()
        user = User.objects.create_user(state["email"], "Synthetic onboarding password 907!")
        request.user = user
        request.session["mfa_verified"] = True
        request.session["auth_realm"] = "staff"
        draft = ClinicOnboarding.objects.get(id=state["id"])
        draft.user = user
        draft.auth_epoch = user.auth_epoch
        draft.progress_data = {
            "clinic": {
                "name": "Synthetic Completion Clinic",
                "email": state["email"],
                "phone": "+639171234567",
            },
            "specialties": {
                "codes": [MedicalSpecialty.objects.first().code],
                "provider_types": ["dentist"],
            },
            "branding": {},
            "practice": {},
        }
        draft.save()
        OnboardingConsent.objects.create(
            draft=draft, user=user, terms_version=NOTICE_VERSION, privacy_version=NOTICE_VERSION
        )
        return request, draft

    def test_atomic_completion_and_replay_no_clinical_role(self):
        request, draft = self.ready()
        key = uuid.uuid4()
        result = complete_onboarding(request, draft.version, key)
        again = complete_onboarding(request, draft.version, key)
        self.assertEqual(result, again)
        org = Organization.objects.get(id=result["organization_id"])
        self.assertEqual(org.name, "Synthetic Completion Clinic")
        self.assertEqual(
            list(
                request.user.membership_set.get(organization=org).roles.values_list(
                    "name", flat=True
                )
            ),
            ["clinic_administrator"],
        )
        self.assertFalse(ProviderProfile.objects.filter(membership__organization=org).exists())
        self.assertEqual(Organization.objects.filter(name=org.name).count(), 1)
        with self.assertRaises(DomainError):
            complete_onboarding(request, draft.version + 1, key)

    def test_injected_failure_rolls_back_entire_clinic(self):
        request, draft = self.ready()
        before = Organization.objects.count()
        with patch(
            "medframe_apps.onboarding.completion.promote_logo",
            side_effect=RuntimeError("synthetic failure"),
        ):
            with self.assertRaises(RuntimeError):
                complete_onboarding(request, draft.version, uuid.uuid4())
        self.assertEqual(Organization.objects.count(), before)
        draft.refresh_from_db()
        self.assertIsNone(draft.completed_at)

    def test_name_collision_and_expiration_deny_completion(self):
        request, draft = self.ready()
        Organization.objects.create(name="synthetic completion clinic")
        with self.assertRaises(DomainError):
            complete_onboarding(request, draft.version, uuid.uuid4())
        self.assertIsNone(ClinicOnboarding.objects.get(id=draft.id).organization_id)
