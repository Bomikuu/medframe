from config.errors import DomainError
from medframe_apps.onboarding.drafts import save_step
from medframe_apps.onboarding.validation import validate_step
from tests_django.onboarding_fixture import OnboardingFixture


class DraftTests(OnboardingFixture):
    def test_partial_saved_but_not_completed_and_version_conflict(self):
        request, state = self.verified()
        updated = save_step(request, "clinic", {"name": "Partial"}, state["version"])
        self.assertEqual(updated["data"]["clinic"]["name"], "Partial")
        self.assertNotIn("clinic", updated["completed_steps"])
        with self.assertRaises(DomainError):
            save_step(request, "clinic", {}, state["version"])
        with self.assertRaises(DomainError):
            save_step(request, "clinic", {"name": "Partial"}, updated["version"], True)

    def test_draft_rejects_account_secrets_and_unknown_fields(self):
        with self.assertRaises(DomainError):
            validate_step("clinic", {"password": "never store this"})
        with self.assertRaises(DomainError):
            validate_step("practice", {"days": [8]})
        with self.assertRaises(DomainError):
            validate_step("branding", {"primary": "#ffffff"})
        with self.assertRaises(DomainError):
            validate_step("practice", {"opens": "17:00", "closes": "09:00"}, True)
