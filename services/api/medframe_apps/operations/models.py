from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import DateTimeRangeField, RangeOperators
from django.db import models

from medframe_apps.common import Record


class BranchOperationsSettings(models.Model):
    branch = models.OneToOneField(
        "organizations.Branch", primary_key=True, on_delete=models.PROTECT
    )
    default_duration = models.PositiveSmallIntegerField(default=30)
    version = models.PositiveIntegerField(default=1)


class BranchRevision(models.Model):
    branch = models.OneToOneField(
        "organizations.Branch", primary_key=True, on_delete=models.PROTECT
    )
    revision = models.PositiveBigIntegerField(default=0)


class BranchResource(Record):
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    name = models.CharField(max_length=80)
    active = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)


class ProviderSchedule(Record):
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    weekday = models.PositiveSmallIntegerField()
    effective_from = models.DateField()
    effective_to = models.DateField()
    opens = models.TimeField()
    closes = models.TimeField()
    duration = models.PositiveSmallIntegerField(default=30)
    active = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)


class ScheduleOverride(Record):
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.PROTECT, null=True)
    date = models.DateField()
    closed = models.BooleanField(default=True)
    opens = models.TimeField(null=True)
    closes = models.TimeField(null=True)
    version = models.PositiveIntegerField(default=1)


class Appointment(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.PROTECT)
    resource = models.ForeignKey(BranchResource, on_delete=models.PROTECT, null=True)
    start = models.DateTimeField()
    end = models.DateTimeField()
    type = models.CharField(max_length=16, default="routine")
    follow_up = models.ForeignKey("treatments.FollowUp", on_delete=models.PROTECT, null=True)
    reason = models.CharField(max_length=240, default="")
    status = models.CharField(max_length=16, default="booked")
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)


class QueueDay(Record):
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    date = models.DateField()
    next_number = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["branch", "date"], name="queue_day_unique")]


class QueueTicket(Record):
    day = models.ForeignKey(QueueDay, on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.PROTECT)
    appointment = models.OneToOneField(Appointment, on_delete=models.PROTECT, null=True)
    resource = models.ForeignKey(BranchResource, on_delete=models.PROTECT, null=True)
    encounter = models.OneToOneField("encounters.Encounter", on_delete=models.PROTECT, null=True)
    number = models.PositiveIntegerField()
    order = models.BigIntegerField()
    status = models.CharField(max_length=16, default="waiting")
    version = models.PositiveIntegerField(default=1)
    duration = models.PositiveSmallIntegerField(default=30)
    delay = models.PositiveSmallIntegerField(default=0)
    service_start = models.DateTimeField(null=True)
    service_user = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, null=True, related_name="active_service_tickets"
    )
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["day", "number"], name="queue_number_unique"),
            models.UniqueConstraint(
                fields=["service_user"],
                condition=models.Q(status="in_service"),
                name="operations_one_active_service",
            ),
        ]


class Reservation(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    provider_user = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    resource = models.ForeignKey(BranchResource, on_delete=models.PROTECT, null=True)
    appointment = models.OneToOneField(Appointment, on_delete=models.PROTECT, null=True)
    ticket = models.OneToOneField(QueueTicket, on_delete=models.PROTECT, null=True)
    period = DateTimeRangeField()
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            ExclusionConstraint(
                name="operations_provider_overlap",
                expressions=[
                    ("provider_user", RangeOperators.EQUAL),
                    ("period", RangeOperators.OVERLAPS),
                ],
                condition=models.Q(active=True),
            ),
            ExclusionConstraint(
                name="operations_resource_overlap",
                expressions=[
                    ("resource", RangeOperators.EQUAL),
                    ("period", RangeOperators.OVERLAPS),
                ],
                condition=models.Q(active=True, resource__isnull=False),
            ),
            ExclusionConstraint(
                name="operations_patient_overlap",
                expressions=[
                    ("patient", RangeOperators.EQUAL),
                    ("organization", RangeOperators.EQUAL),
                    ("period", RangeOperators.OVERLAPS),
                ],
                condition=models.Q(active=True),
            ),
            models.CheckConstraint(
                condition=models.Q(appointment__isnull=False, ticket__isnull=True)
                | models.Q(appointment__isnull=True, ticket__isnull=False),
                name="operations_reservation_owner",
            ),
        ]


class OperationsEvent(Record):
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    object_id = models.UUIDField()
    kind = models.CharField(max_length=48)
    before = models.JSONField(default=dict)
    after = models.JSONField(default=dict)
    reason = models.CharField(max_length=240, default="")
