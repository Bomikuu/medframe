"""Room-specific access never replaces native staff or portal sessions."""

from django.db import models
from medframe_apps.common import Record


class AppointmentRoom(Record):
    appointment = models.OneToOneField(
        "operations.Appointment", on_delete=models.PROTECT, related_name="online_room"
    )
    bound_patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    bound_branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    doctor_mode = models.CharField(
        max_length=12,
        default="assigned",
        choices=[("assigned", "Assigned doctor"), ("eligible", "Eligible clinic doctor")],
    )
    claimed_provider = models.ForeignKey(
        "providers.ProviderProfile", null=True, on_delete=models.PROTECT
    )
    pin_hash = models.TextField()
    pin_display = models.TextField()
    generation = models.PositiveIntegerField(default=1)
    version = models.PositiveIntegerField(default=1)
    started = models.BooleanField(default=False)
    timing_mode = models.CharField(
        max_length=12,
        default="scheduled",
        choices=[("scheduled", "Scheduled"), ("instant", "Instant")],
    )
    ended_at = models.DateTimeField(null=True)
    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()
    next_sequence = models.PositiveBigIntegerField(default=1)
    encounter = models.ForeignKey("encounters.Encounter", null=True, on_delete=models.PROTECT)


class RoomAftercare(Record):
    """An explicitly shared, authored instruction snapshot; never the clinical draft."""

    room = models.ForeignKey(AppointmentRoom, on_delete=models.PROTECT, related_name="aftercare")
    author = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    generation = models.PositiveIntegerField()
    next_steps = models.CharField(max_length=2000)
    follow_up = models.CharField(max_length=500, default="")


class RoomParticipant(Record):
    room = models.ForeignKey(AppointmentRoom, on_delete=models.PROTECT, related_name="participants")
    role = models.CharField(max_length=8, choices=[("doctor", "Doctor"), ("patient", "Patient")])
    user = models.ForeignKey("accounts.User", null=True, on_delete=models.PROTECT)
    native_session_key = models.CharField(max_length=64, default="")
    proof_hash = models.CharField(max_length=64, unique=True)
    generation = models.PositiveIntegerField()
    revoked = models.BooleanField(default=False)
    admitted = models.BooleanField(default=False)
    admitted_at = models.DateTimeField(null=True)
    last_seen_at = models.DateTimeField(null=True)
    device_checks = models.JSONField(default=dict)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["room", "role"],
                condition=models.Q(revoked=False),
                name="call_one_live_role",
            ),
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(role="doctor", revoked=False),
                name="call_one_doctor_room",
            ),
        ]


class RoomMessage(Record):
    room = models.ForeignKey(AppointmentRoom, on_delete=models.PROTECT)
    participant = models.ForeignKey(RoomParticipant, on_delete=models.PROTECT)
    sequence = models.PositiveBigIntegerField()
    request_id = models.UUIDField()
    body = models.CharField(max_length=2000)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["room", "sequence"], name="call_message_sequence"),
            models.UniqueConstraint(
                fields=["participant", "request_id"], name="call_message_retry"
            ),
        ]


class RoomAttachment(Record):
    room = models.ForeignKey(AppointmentRoom, on_delete=models.PROTECT)
    participant = models.ForeignKey(RoomParticipant, on_delete=models.PROTECT)
    request_id = models.UUIDField()
    filename = models.CharField(max_length=160)
    content_type = models.CharField(max_length=64)
    size = models.PositiveIntegerField()
    key = models.CharField(max_length=200, unique=True)
    scan_state = models.CharField(max_length=16, default="pending")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["participant", "request_id"], name="call_file_retry")
        ]
