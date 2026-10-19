from django.db import models

from medframe_apps.common import Record


class ClinicInvitation(Record):
    email = models.EmailField(max_length=320)
    contact_name = models.CharField(max_length=160, blank=True)
    clinic_name = models.CharField(max_length=160, blank=True)
    token_hash = models.CharField(max_length=64, unique=True)
    generation = models.PositiveIntegerField(default=1)
    version = models.PositiveIntegerField(default=1)
    request_id = models.UUIDField(unique=True)
    issued_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    expires_at = models.DateTimeField()
    opened_at = models.DateTimeField(null=True)
    verified_at = models.DateTimeField(null=True)
    revoked_at = models.DateTimeField(null=True)
    completed_at = models.DateTimeField(null=True)


class ClinicOnboarding(Record):
    invitation = models.OneToOneField(ClinicInvitation, on_delete=models.PROTECT)
    user = models.ForeignKey("accounts.User", null=True, on_delete=models.PROTECT)
    auth_epoch = models.PositiveIntegerField(null=True)
    organization = models.OneToOneField(
        "organizations.Organization", null=True, on_delete=models.PROTECT
    )
    version = models.PositiveIntegerField(default=1)
    schema_version = models.PositiveIntegerField(default=1)
    current_step = models.CharField(max_length=24, default="clinic")
    completed_steps = models.JSONField(default=list)
    intro_status = models.CharField(max_length=16, default="not_started")
    status = models.CharField(max_length=24, default="not_started")
    progress_data = models.JSONField(default=dict)
    last_saved_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True)
    completion_key = models.UUIDField(null=True)
    completion_digest = models.CharField(max_length=64, blank=True)
    completion_result = models.JSONField(default=dict)


class OnboardingVerification(Record):
    invitation = models.ForeignKey(ClinicInvitation, on_delete=models.PROTECT)
    generation = models.PositiveIntegerField()
    session_hash = models.CharField(max_length=64)
    code_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    verified_at = models.DateTimeField(null=True)
    proof_expires = models.DateTimeField(null=True)
    last_seen = models.DateTimeField(null=True)
    invalidated = models.BooleanField(default=False)


class OnboardingLogo(Record):
    draft = models.ForeignKey(ClinicOnboarding, on_delete=models.PROTECT)
    key = models.CharField(max_length=200, unique=True)
    filename = models.CharField(max_length=160)
    content_type = models.CharField(max_length=64)
    size = models.PositiveIntegerField()
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    sha256 = models.CharField(max_length=64)
    scan_state = models.CharField(max_length=16, default="pending")
    selected = models.BooleanField(default=True)
    promoted = models.BooleanField(default=False)


class MedicalSpecialty(models.Model):
    code = models.CharField(max_length=48, primary_key=True)
    name = models.CharField(max_length=80)
    category = models.CharField(max_length=24)
    active = models.BooleanField(default=True)


class OrganizationSpecialty(models.Model):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    specialty = models.ForeignKey(MedicalSpecialty, on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "specialty"], name="onboarding_org_specialty"
            )
        ]


class SpecialtyRequest(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    label = models.CharField(max_length=80)


class OrganizationProfile(models.Model):
    organization = models.OneToOneField(
        "organizations.Organization", on_delete=models.PROTECT, primary_key=True
    )
    email = models.EmailField(max_length=320)
    phone = models.CharField(max_length=20)
    country = models.CharField(max_length=2, blank=True)
    region = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    street = models.CharField(max_length=255, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    short_name = models.CharField(max_length=40, blank=True)


class OrganizationPractice(models.Model):
    organization = models.OneToOneField(
        "organizations.Organization", on_delete=models.PROTECT, primary_key=True
    )
    branch = models.OneToOneField("organizations.Branch", on_delete=models.PROTECT)
    duration_minutes = models.PositiveIntegerField(default=30)
    walk_in_policy = models.CharField(max_length=24)
    provider_count = models.CharField(max_length=16)


class PracticeDay(models.Model):
    practice = models.ForeignKey(OrganizationPractice, on_delete=models.PROTECT)
    weekday = models.PositiveSmallIntegerField()
    opens = models.TimeField()
    closes = models.TimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["practice", "weekday"], name="onboarding_practice_day")
        ]


class ProviderTypeSelection(models.Model):
    practice = models.ForeignKey(OrganizationPractice, on_delete=models.PROTECT)
    kind = models.CharField(max_length=32)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["practice", "kind"], name="onboarding_provider_kind")
        ]


class OnboardingConsent(Record):
    draft = models.OneToOneField(ClinicOnboarding, on_delete=models.PROTECT)
    user = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    terms_version = models.CharField(max_length=64)
    privacy_version = models.CharField(max_length=64)


class SetupChecklistState(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    user = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    dismissed = models.BooleanField(default=False)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user"], name="onboarding_checklist_owner"
            )
        ]
