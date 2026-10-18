from django.db import models

from medframe_apps.common import Record


class Procedure(Record):
    revision = models.ForeignKey("encounters.EncounterRevision", on_delete=models.PROTECT)
    description = models.CharField(max_length=240)
    status = models.CharField(max_length=20)
    tooth = models.CharField(max_length=2, default="")
    surfaces = models.JSONField(default=list)
    notes = models.CharField(max_length=500, default="")


class TreatmentPlan(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    title = models.CharField(max_length=240)
    version = models.PositiveIntegerField(default=1)
    request_id = models.UUIDField()
    request_digest = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "created_by", "request_id"], name="plan_request"
            )
        ]


class TreatmentPlanItem(Record):
    plan = models.ForeignKey(TreatmentPlan, on_delete=models.PROTECT, related_name="items")
    position = models.PositiveIntegerField()
    description = models.CharField(max_length=240)
    status = models.CharField(max_length=20, default="proposed")
    tooth = models.CharField(max_length=2, default="")
    completed_revision = models.ForeignKey(
        "encounters.EncounterRevision", on_delete=models.PROTECT, null=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["plan", "position"],
                name="plan_item_position",
                deferrable=models.Deferrable.DEFERRED,
            )
        ]


class TreatmentPlanEvent(Record):
    plan = models.ForeignKey(TreatmentPlan, on_delete=models.PROTECT)
    item = models.ForeignKey(TreatmentPlanItem, on_delete=models.PROTECT, null=True)
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    status = models.CharField(max_length=20)
    version = models.PositiveIntegerField()


class TreatmentPlanRevision(Record):
    plan = models.ForeignKey(TreatmentPlan, on_delete=models.PROTECT, related_name="revisions")
    version = models.PositiveIntegerField()
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    snapshot = models.JSONField()
    provenance = models.CharField(max_length=32, default="clinical_edit")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["plan", "version"], name="plan_revision_version")
        ]


class FollowUp(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    plan = models.ForeignKey(TreatmentPlan, on_delete=models.PROTECT, null=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    instructions = models.TextField()
    due_date = models.DateField(null=True)
    status = models.CharField(max_length=16, default="open")
    version = models.PositiveIntegerField(default=1)


class FollowUpRevision(Record):
    follow_up = models.ForeignKey(FollowUp, on_delete=models.PROTECT, related_name="revisions")
    version = models.PositiveIntegerField()
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    snapshot = models.JSONField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["follow_up", "version"], name="follow_up_revision_version"
            )
        ]
