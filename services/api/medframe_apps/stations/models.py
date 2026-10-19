from django.db import models
from django.utils import timezone

from medframe_apps.common import Record


class StationDevice(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    name = models.CharField(max_length=80)
    mode = models.CharField(max_length=20)
    functions = models.JSONField(default=list)
    state = models.CharField(max_length=20, default="setup")
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    approved_by = models.ForeignKey(
        "accounts.User", null=True, on_delete=models.PROTECT, related_name="approved_stations"
    )
    approved_at = models.DateTimeField(null=True)
    last_seen_at = models.DateTimeField(null=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(mode__in=["clinician", "kiosk", "display"]),
                name="station_device_mode",
            ),
            models.CheckConstraint(
                condition=models.Q(state__in=["setup", "pending", "active", "revoked"]),
                name="station_device_state",
            ),
        ]


class PairingChallenge(Record):
    device = models.ForeignKey(StationDevice, on_delete=models.PROTECT)
    digest = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True)
    issued_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)


class DeviceCredential(Record):
    device = models.ForeignKey(StationDevice, on_delete=models.PROTECT)
    digest = models.CharField(max_length=64, unique=True)
    verification_phrase = models.CharField(max_length=12)
    expires_at = models.DateTimeField()
    revoked = models.BooleanField(default=False)


class EditingLease(models.Model):
    encounter = models.OneToOneField(
        "encounters.Encounter", primary_key=True, on_delete=models.PROTECT
    )
    owner = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    client_digest = models.CharField(max_length=64)
    credential = models.ForeignKey(DeviceCredential, null=True, on_delete=models.PROTECT)
    expires_at = models.DateTimeField()
    generation = models.PositiveIntegerField(default=1)
    locked = models.BooleanField(default=False)
    updated_at = models.DateTimeField(default=timezone.now)
    selection = models.JSONField(default=dict)


class ConsultationHandoff(Record):
    encounter = models.ForeignKey("encounters.Encounter", on_delete=models.PROTECT)
    sender = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    recipient = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="station_handoffs_received"
    )
    provider = models.ForeignKey("providers.ProviderProfile", null=True, on_delete=models.PROTECT)
    kind = models.CharField(max_length=20)
    digest = models.CharField(max_length=64, unique=True)
    expected_version = models.PositiveIntegerField()
    lease_generation = models.PositiveIntegerField()
    summary = models.CharField(max_length=1200, default="")
    tasks = models.CharField(max_length=1200, default="")
    selection = models.JSONField(default=dict)
    state = models.CharField(max_length=20, default="pending")
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True)
    accepted_credential = models.ForeignKey(DeviceCredential, null=True, on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["encounter"],
                condition=models.Q(state="pending"),
                name="station_one_pending_handoff",
            ),
            models.CheckConstraint(
                condition=models.Q(kind__in=["device", "responsibility"]),
                name="station_handoff_kind",
            ),
        ]


class StationEvent(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    actor = models.ForeignKey("accounts.User", null=True, on_delete=models.PROTECT)
    device = models.ForeignKey(StationDevice, null=True, on_delete=models.PROTECT)
    encounter = models.ForeignKey("encounters.Encounter", null=True, on_delete=models.PROTECT)
    handoff = models.ForeignKey(ConsultationHandoff, null=True, on_delete=models.PROTECT)
    kind = models.CharField(max_length=40)


class HandoffAccessProof(Record):
    handoff = models.OneToOneField(
        ConsultationHandoff, on_delete=models.PROTECT, related_name="access_proof"
    )
    source_session = models.ForeignKey("accounts.ClinicalSession", on_delete=models.PROTECT)
    source_auth_epoch = models.PositiveIntegerField()


class StationAccessSession(Record):
    session = models.OneToOneField("accounts.ClinicalSession", on_delete=models.PROTECT)
    handoff = models.OneToOneField(ConsultationHandoff, on_delete=models.PROTECT)
    credential = models.ForeignKey(DeviceCredential, on_delete=models.PROTECT)
    expires_at = models.DateTimeField()


class DoctorAccessCode(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.PROTECT)
    source_session = models.ForeignKey("accounts.ClinicalSession", on_delete=models.PROTECT)
    source_auth_epoch = models.PositiveIntegerField()
    digest = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True)


class DoctorStationSession(Record):
    session = models.OneToOneField("accounts.ClinicalSession", on_delete=models.PROTECT)
    code = models.OneToOneField(DoctorAccessCode, on_delete=models.PROTECT)
    credential = models.ForeignKey(DeviceCredential, on_delete=models.PROTECT)
    expires_at = models.DateTimeField()


class WalkInCommit(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    request_id = models.UUIDField()
    input_digest = models.CharField(max_length=64)
    encounter = models.OneToOneField("encounters.Encounter", on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "actor", "request_id"], name="station_walk_in_once"
            )
        ]
