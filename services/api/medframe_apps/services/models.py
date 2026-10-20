from django.db import models

from medframe_apps.common import Record


class ServiceDefinition(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    branches = models.ManyToManyField("organizations.Branch")
    name = models.CharField(max_length=160)
    category = models.CharField(max_length=80, default="")
    description = models.CharField(max_length=1200, default="")
    active = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)
    price = models.PositiveBigIntegerField()
    workflow = models.JSONField(default=list)
    payment_mode = models.CharField(max_length=12, default="full")
    deposit = models.PositiveBigIntegerField(default=0)
    months = models.PositiveSmallIntegerField(default=1)


class PatientServiceCase(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    service = models.ForeignKey(ServiceDefinition, on_delete=models.PROTECT)
    service_version = models.PositiveIntegerField()
    snapshot = models.JSONField()
    status = models.CharField(max_length=12, default="active")
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)


class ServiceCaseStep(Record):
    case = models.ForeignKey(PatientServiceCase, on_delete=models.PROTECT, related_name="steps")
    position = models.PositiveSmallIntegerField()
    label = models.CharField(max_length=240)
    status = models.CharField(max_length=16, default="pending")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["case", "position"], name="service_case_step_position")
        ]


class ServiceCaseEvent(Record):
    case = models.ForeignKey(PatientServiceCase, on_delete=models.PROTECT, related_name="events")
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    kind = models.CharField(max_length=16)
    version = models.PositiveIntegerField()
    step = models.ForeignKey(ServiceCaseStep, null=True, on_delete=models.PROTECT)
    status = models.CharField(max_length=16)
    reason = models.CharField(max_length=500, default="")
