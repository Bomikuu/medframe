from django.db import IntegrityError, transaction

from medframe_apps.onboarding.models import ClinicOnboarding, MedicalSpecialty
from medframe_apps.organizations.models import Organization
from tests_django.onboarding_fixture import OnboardingFixture


class ModelTests(OnboardingFixture):
    def test_drafts_do_not_create_organizations_and_are_unique(self):
        before = Organization.objects.count()
        _, state = self.verified()
        draft = ClinicOnboarding.objects.get(id=state["id"])
        self.assertEqual(before, Organization.objects.count())
        with self.assertRaises(IntegrityError), transaction.atomic():
            ClinicOnboarding.objects.create(invitation=draft.invitation)
        self.assertEqual(MedicalSpecialty.objects.count(), 14)
