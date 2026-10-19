from django.db import models

from medframe_apps.common import Record


class AnatomyFindingIdentity(Record):
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)


class AnatomyFinding(Record):
    identity = models.ForeignKey(AnatomyFindingIdentity, on_delete=models.PROTECT)
    revision = models.ForeignKey("encounters.EncounterRevision", on_delete=models.PROTECT)
    structure_id = models.CharField(max_length=160)
    side = models.CharField(max_length=12)
    layer = models.CharField(max_length=12)
    status = models.CharField(max_length=24)
    content = models.JSONField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["revision", "identity"], name="anatomy_revision_key")
        ]
        indexes = [models.Index(fields=["structure_id", "status"])]


class AnatomyChartRevision(Record):
    revision = models.OneToOneField("encounters.EncounterRevision", on_delete=models.PROTECT)
    registry_version = models.PositiveSmallIntegerField(default=1)


class AnatomyChartEntry(Record):
    chart = models.ForeignKey(
        AnatomyChartRevision, on_delete=models.PROTECT, related_name="entries"
    )
    finding = models.ForeignKey(AnatomyFinding, on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["chart", "finding"], name="anatomy_chart_entry")
        ]
