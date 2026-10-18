from django.db import models
from django.utils import timezone

from medframe_apps.common import Record


class Encounter(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.PROTECT)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    reason = models.CharField(max_length=240)
    status = models.CharField(max_length=20, default="draft")
    version = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(default=timezone.now)
    request_id = models.UUIDField()
    request_digest = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "created_by", "request_id"], name="encounter_request"
            ),
            models.CheckConstraint(
                condition=models.Q(status__in=["draft", "in_progress", "completed", "finalized"]),
                name="encounter_status",
            ),
        ]
        indexes = [models.Index(fields=["organization", "patient", "-created_at"])]


class EncounterDraft(Record):
    encounter = models.OneToOneField(Encounter, on_delete=models.PROTECT, related_name="draft")
    content = models.JSONField(default=dict)
    amendment_reason = models.CharField(max_length=500, default="")
    base_revision_version = models.PositiveIntegerField(default=0)
    is_amendment = models.BooleanField(default=False)
    amendment_state = models.CharField(max_length=20, default="draft")
    updated_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)


class EncounterRevision(Record):
    encounter = models.ForeignKey(Encounter, on_delete=models.PROTECT, related_name="revisions")
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    version = models.PositiveIntegerField()
    author = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    content = models.JSONField()
    amendment_reason = models.CharField(max_length=500, default="")
    chart = models.JSONField(default=list)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["encounter", "version"], name="encounter_revision_version"
            )
        ]


class Diagnosis(Record):
    revision = models.ForeignKey(EncounterRevision, on_delete=models.PROTECT)
    description = models.CharField(max_length=240)
    certainty = models.CharField(max_length=20)
    code = models.CharField(max_length=40, default="")


class ClinicalNote(Record):
    revision = models.ForeignKey(EncounterRevision, on_delete=models.PROTECT)
    section = models.CharField(max_length=20)
    text = models.TextField()


class Observation(Record):
    revision = models.ForeignKey(EncounterRevision, on_delete=models.PROTECT)
    label = models.CharField(max_length=120)
    value = models.CharField(max_length=240)
    source = models.CharField(max_length=20)


class EncounterTimelineLink(Record):
    event = models.OneToOneField("patients.PatientEvent", on_delete=models.PROTECT)
    revision = models.ForeignKey(EncounterRevision, on_delete=models.PROTECT)
