import uuid
from concurrent.futures import ThreadPoolExecutor

from django.contrib.sessions.backends.db import SessionStore
from django.db import close_old_connections
from django.test import TransactionTestCase

from medframe_apps.accounts.models import User
from medframe_apps.onboarding.completion import complete_onboarding
from medframe_apps.onboarding.models import MedicalSpecialty
from medframe_apps.organizations.models import Organization
from tests_django.onboarding_fixture import OnboardingFixture
from tests_django.test_onboarding_completion import CompletionTests


class ConcurrentCompletionTests(TransactionTestCase):
    request = OnboardingFixture.request
    invited = OnboardingFixture.invited
    verified = OnboardingFixture.verified
    ready = CompletionTests.ready

    def setUp(self):
        self.platform = User.objects.create_superuser("concurrent-platform@example.test")
        MedicalSpecialty.objects.get_or_create(
            code="general_dentistry", defaults={"name": "General Dentistry", "category": "dental"}
        )

    def test_simultaneous_completion_creates_one_clinic(self):
        request, draft = self.ready()
        request.session.save()
        session_key = request.session.session_key
        user_id = request.user.id
        key = uuid.uuid4()

        def complete():
            close_old_connections()
            try:
                context = self.request(User.objects.get(id=user_id))
                context.session = SessionStore(session_key=session_key)
                return complete_onboarding(context, draft.version, key)
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: complete(), range(2)))
        self.assertEqual(results[0], results[1])
        self.assertEqual(Organization.objects.filter(name="Synthetic Completion Clinic").count(), 1)
