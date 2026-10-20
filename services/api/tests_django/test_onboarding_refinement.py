from datetime import time, timedelta
from types import SimpleNamespace
from uuid import uuid4
from zoneinfo import ZoneInfo

from django.utils import timezone

from api_graphql.onboarding_admin import OnboardingAdminQuery
from config.errors import DomainError
from medframe_apps.encounters.models import ConsultationTemplate
from medframe_apps.onboarding.completion import complete_onboarding
from medframe_apps.onboarding.drafts import snapshot
from medframe_apps.operations.models import ProviderSchedule
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.providers.models import ProviderProfile
from tests_django import test_onboarding_completion as completion
from tests_django.onboarding_fixture import OnboardingFixture


class OnboardingRefinementTests(OnboardingFixture):
    def completed(self):
        request, draft = completion.CompletionTests.ready(self)
        result = complete_onboarding(request, draft.version, uuid4())
        organization = Organization.objects.get(id=result["organization_id"])
        return request, organization

    def checklist(self, request, organization):
        return OnboardingAdminQuery().clinic_setup_checklist(
            SimpleNamespace(context=request), organization.id
        )

    def test_summary_returns_actual_bound_administrator_and_rejects_other_user(self):
        request, draft = completion.CompletionTests.ready(self)
        request.user.display_name = "Dr. Synthetic de la Cruz"
        request.user.save(update_fields=["display_name"])
        result = snapshot(request)
        self.assertEqual(result["administrator_name"], "Dr. Synthetic de la Cruz")
        self.assertEqual(result["email"], draft.invitation.email)
        request.user = self.platform
        with self.assertRaises(DomainError):
            snapshot(request)

    def test_first_run_progress_is_real_and_template_flag_requires_authoring(self):
        request, organization = self.completed()
        result = self.checklist(request, organization)
        self.assertTrue(result["available"])
        self.assertFalse(result["has_patient"])
        self.assertTrue(result["has_specialty"])
        self.assertIsNone(result["has_template"])
        template = ConsultationTemplate.objects.create(
            organization=organization, created_by=request.user, name="Synthetic configuration"
        )
        self.assertIsNone(self.checklist(request, organization)["has_template"])
        membership = Membership.objects.get(user=request.user, organization=organization)
        membership.roles.add("doctor")
        self.assertTrue(self.checklist(request, organization)["has_template"])
        template.active = False
        template.save(update_fields=["active"])
        self.assertFalse(self.checklist(request, organization)["has_template"])
        self.assertNotIn("patients", result)

    def test_availability_progress_respects_branch_active_state_and_expiration(self):
        request, organization = self.completed()
        branch = Branch.objects.get(organization=organization)
        membership = Membership.objects.get(user=request.user, organization=organization)
        membership.branch = branch
        membership.roles.add("doctor")
        membership.save(update_fields=["branch"])
        provider_member = Membership.objects.create(user=self.platform, organization=organization)
        provider_member.roles.add("doctor")
        provider = ProviderProfile.objects.create(membership=provider_member)
        other = Branch.objects.create(organization=organization, name="Other synthetic branch")
        today = timezone.localdate(timezone=ZoneInfo(organization.timezone))
        schedule = ProviderSchedule.objects.create(
            provider=provider,
            branch=other,
            weekday=today.weekday(),
            effective_from=today,
            effective_to=today + timedelta(days=7),
            opens=time(8),
            closes=time(17),
        )
        self.assertFalse(self.checklist(request, organization)["has_schedule"])
        schedule.branch = branch
        schedule.save(update_fields=["branch"])
        self.assertTrue(self.checklist(request, organization)["has_schedule"])
        schedule.active = False
        schedule.save(update_fields=["active"])
        self.assertFalse(self.checklist(request, organization)["has_schedule"])
        schedule.active, schedule.effective_to = True, today - timedelta(days=1)
        schedule.effective_from = today - timedelta(days=7)
        schedule.save(update_fields=["active", "effective_from", "effective_to"])
        self.assertFalse(self.checklist(request, organization)["has_schedule"])

    def test_unonboarded_org_is_unavailable_and_nonmember_is_denied(self):
        request, organization = self.completed()
        other = Organization.objects.create(name="Synthetic existing organization")
        with self.assertRaises(DomainError):
            self.checklist(request, other)
        membership = Membership.objects.create(user=request.user, organization=other)
        membership.roles.add("clinic_administrator")
        self.assertEqual(self.checklist(request, other), {"available": False})
