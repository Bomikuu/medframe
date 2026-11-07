from django.db import models

from medframe_apps.common import Record


class RegistrationEntry(Record):
    branch = models.OneToOneField("organizations.Branch", on_delete=models.PROTECT)
    token = models.CharField(max_length=80, unique=True)
    enabled = models.BooleanField(default=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)


class RegistrationContact(Record):
    entry = models.ForeignKey(RegistrationEntry, on_delete=models.PROTECT)
    channel = models.CharField(max_length=12, default="email")
    phone = models.CharField(max_length=20, default="")
    delivery_state = models.CharField(max_length=24, default="queued")
    email = models.EmailField(max_length=254, blank=True)
    session_hash = models.CharField(max_length=64)
    code_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    invalidated = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True)
    verified_until = models.DateTimeField(null=True)


class PatientApplication(Record):
    contact = models.OneToOneField(RegistrationContact, on_delete=models.PROTECT)
    portal_email = models.EmailField(max_length=254, default="", blank=True)
    full_name = models.CharField(max_length=160)
    date_of_birth = models.DateField(null=True)
    sex = models.CharField(max_length=16, default="not_recorded")
    phone = models.CharField(max_length=40, default="")
    relationship = models.CharField(max_length=12, default="self")
    contact_name = models.CharField(max_length=160, default="")
    state = models.CharField(max_length=12, default="pending")
    version = models.PositiveIntegerField(default=1)
    reviewed_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, null=True)
    reviewed_at = models.DateTimeField(null=True)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, null=True)
    invitation = models.OneToOneField(
        "portal.PortalInvitation", on_delete=models.PROTECT, null=True
    )

    @property
    def email_for_portal(self):
        return self.portal_email or self.contact.email

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(state__in=["pending", "accepted", "declined"]),
                name="portal_application_state",
            ),
            models.CheckConstraint(
                condition=models.Q(relationship__in=["self", "guardian"]),
                name="portal_application_relationship",
            ),
        ]
