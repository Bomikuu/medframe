"""Patient self-service identity is separate from native staff and device identity."""

from django.db import models
from django.db.models import Q

from medframe_apps.common import Record


class StationDepartment(Record):
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    name = models.CharField(max_length=80)
    prefix = models.CharField(max_length=4)
    kind = models.CharField(max_length=20)
    active = models.BooleanField(default=True)
    duration = models.PositiveSmallIntegerField(default=30)
    early_minutes = models.PositiveSmallIntegerField(default=60)
    late_minutes = models.PositiveSmallIntegerField(default=120)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["branch", "prefix"], name="station_department_prefix"),
            models.CheckConstraint(
                condition=Q(kind__in=["consultation", "laboratory", "cashier", "other"]),
                name="station_department_kind",
            ),
            models.CheckConstraint(
                condition=Q(duration__gte=5, duration__lte=240), name="station_department_duration"
            ),
        ]


class DepartmentCounter(models.Model):
    department = models.ForeignKey(StationDepartment, on_delete=models.PROTECT)
    date = models.DateField()
    next_number = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["department", "date"], name="station_department_day")
        ]


class StationVisit(Record):
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    date = models.DateField()
    state = models.CharField(max_length=16, default="open")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["branch", "patient", "date"],
                condition=Q(state="open"),
                name="station_one_open_daily_visit",
            )
        ]


class VisitStage(Record):
    visit = models.ForeignKey(StationVisit, on_delete=models.PROTECT, related_name="stages")
    department = models.ForeignKey(StationDepartment, on_delete=models.PROTECT)
    number = models.PositiveIntegerField()
    label = models.CharField(max_length=16)
    status = models.CharField(max_length=16, default="waiting")
    priority = models.BooleanField(default=False)
    version = models.PositiveIntegerField(default=1)
    queue_ticket = models.OneToOneField(
        "operations.QueueTicket", null=True, on_delete=models.PROTECT
    )
    previous = models.OneToOneField("self", null=True, on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["visit"],
                condition=Q(status__in=["waiting", "called", "in_service"]),
                name="station_one_active_visit_stage",
            ),
            models.CheckConstraint(
                condition=Q(
                    status__in=[
                        "waiting",
                        "called",
                        "in_service",
                        "completed",
                        "skipped",
                        "cancelled",
                        "transferred",
                    ]
                ),
                name="station_stage_status",
            ),
        ]


class KioskProof(Record):
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    issued_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    membership = models.ForeignKey("organizations.Membership", null=True, on_delete=models.PROTECT)
    portal_link = models.ForeignKey("portal.PortalLink", null=True, on_delete=models.PROTECT)
    method = models.CharField(max_length=80)
    digest = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True)


class KioskPatientSession(Record):
    proof = models.ForeignKey(KioskProof, on_delete=models.PROTECT)
    credential = models.ForeignKey("stations.DeviceCredential", on_delete=models.PROTECT)
    digest = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    last_active_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True)


class KioskRequest(Record):
    session = models.ForeignKey(KioskPatientSession, on_delete=models.PROTECT)
    request_id = models.UUIDField()
    digest = models.CharField(max_length=64)
    result = models.JSONField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["session", "request_id"], name="station_kiosk_request_once"
            )
        ]


class KioskIntake(Record):
    credential = models.ForeignKey("stations.DeviceCredential", on_delete=models.PROTECT)
    request_id = models.UUIDField()
    full_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=40)
    date_of_birth = models.DateField(null=True)
    state = models.CharField(max_length=16, default="pending")
    patient = models.ForeignKey("patients.Patient", null=True, on_delete=models.PROTECT)
    reviewed_by = models.ForeignKey("accounts.User", null=True, on_delete=models.PROTECT)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["credential", "request_id"], name="station_intake_retry"
            )
        ]


class KioskEvent(Record):
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    kind = models.CharField(max_length=48)
    object_id = models.UUIDField()
    reason = models.CharField(max_length=240, default="")
    details = models.JSONField(default=dict)


class KioskBoundary(models.Model):
    credential = models.OneToOneField(
        "stations.DeviceCredential", primary_key=True, on_delete=models.PROTECT
    )
    generation = models.PositiveIntegerField(default=1)


class KioskPolicy(models.Model):
    device = models.OneToOneField(
        "stations.StationDevice", primary_key=True, on_delete=models.PROTECT
    )
    strict_verification = models.BooleanField(default=False)


class KioskAssignment(Record):
    credential = models.ForeignKey("stations.DeviceCredential", on_delete=models.PROTECT)
    proof = models.OneToOneField("stations.KioskProof", on_delete=models.PROTECT)
    generation = models.PositiveIntegerField()
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["credential"],
                condition=models.Q(consumed_at__isnull=True),
                name="station_one_pending_assignment",
            )
        ]
