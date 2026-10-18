from django.db import models

from medframe_apps.common import Record


class ToothFinding(Record):
    revision = models.ForeignKey("encounters.EncounterRevision", on_delete=models.PROTECT)
    finding_key = models.UUIDField()
    tooth = models.CharField(max_length=2)
    surfaces = models.JSONField(default=list)
    condition = models.CharField(max_length=120)
    severity = models.CharField(max_length=20)
    status = models.CharField(max_length=20)
    notes = models.CharField(max_length=500, default="")


class DentalChartRevision(Record):
    revision = models.OneToOneField("encounters.EncounterRevision", on_delete=models.PROTECT)
    findings = models.JSONField(default=list)
