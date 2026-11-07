from django.db import models

from medframe_apps.common import Record


class PortalInvitation(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    issued_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    email = models.EmailField(max_length=320)
    relationship = models.CharField(max_length=12)
    method = models.CharField(max_length=48)
    note = models.CharField(max_length=240, default="")
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True)
    consumed_at = models.DateTimeField(null=True)
    pending_user = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, null=True, related_name="pending_invitations"
    )
    pending_session_hash = models.CharField(max_length=64, default="")
    pending_epoch = models.PositiveIntegerField(default=0)


class PortalLink(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    user = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    invitation = models.OneToOneField(PortalInvitation, on_delete=models.PROTECT)
    relationship = models.CharField(max_length=12)
    active = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["patient"],
                condition=models.Q(active=True, relationship="self"),
                name="portal_active_self",
            ),
            models.UniqueConstraint(
                fields=["user", "patient", "relationship"],
                condition=models.Q(active=True),
                name="portal_active_relationship",
            ),
        ]


class PortalAccessEvent(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    invitation = models.ForeignKey(PortalInvitation, on_delete=models.PROTECT, null=True)
    link = models.ForeignKey(PortalLink, on_delete=models.PROTECT, null=True)
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    action = models.CharField(max_length=24)
    reason = models.CharField(max_length=240, default="")


class PortalRelease(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    author = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    sequence = models.PositiveIntegerField()
    payload = models.JSONField()
    manifest = models.JSONField()
    digest = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["patient", "sequence"], name="portal_release_sequence")
        ]


class ReleaseEvent(Record):
    release = models.ForeignKey(PortalRelease, on_delete=models.PROTECT, related_name="events")
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    version = models.PositiveIntegerField()
    state = models.CharField(max_length=16)
    reason = models.CharField(max_length=240, default="")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["release", "version"], name="portal_release_state_version"
            )
        ]


class ReleaseDocument(Record):
    release = models.ForeignKey(PortalRelease, on_delete=models.PROTECT, related_name="documents")
    version = models.ForeignKey("documents.DocumentVersion", on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["release", "version"], name="portal_release_document")
        ]


class PatientReport(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    link = models.ForeignKey(PortalLink, on_delete=models.PROTECT)
    author = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    category = models.CharField(max_length=16)
    text = models.TextField()


class ReportReview(Record):
    report = models.ForeignKey(PatientReport, on_delete=models.PROTECT, related_name="reviews")
    author = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    version = models.PositiveIntegerField()
    state = models.CharField(max_length=16)
    history_revision = models.ForeignKey(
        "patients.PatientClinicalRevision", on_delete=models.PROTECT, null=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["report", "version"], name="patient_report_review_version"
            )
        ]


# Keep public intake records separate from authenticated portal-access records.
from .registration_models import PatientApplication, RegistrationContact, RegistrationEntry  # noqa: E402, F401
