from django.db import models

from medframe_apps.common import Record


class CommunicationSettings(Record):
    organization = models.OneToOneField("organizations.Organization", on_delete=models.PROTECT)
    appointment_automatic = models.BooleanField(default=False)
    follow_up_automatic = models.BooleanField(default=False)
    updated_by = models.ForeignKey("accounts.User", null=True, on_delete=models.PROTECT)
    version = models.PositiveIntegerField(default=1)


class CommunicationPreference(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.OneToOneField("patients.Patient", on_delete=models.PROTECT)
    encrypted_recipient = models.TextField(default="")
    recipient_hash = models.CharField(max_length=64, default="")
    recipient_name = models.CharField(max_length=160, default="")
    recipient_user = models.ForeignKey("accounts.User", null=True, on_delete=models.PROTECT)
    sms_enabled = models.BooleanField(default=False)
    in_app_enabled = models.BooleanField(default=False)
    appointments = models.BooleanField(default=False)
    follow_ups = models.BooleanField(default=False)
    billing = models.BooleanField(default=False)
    confirmed_by = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="confirmed_contacts"
    )
    confirmed_at = models.DateTimeField()
    version = models.PositiveIntegerField(default=1)


class Reminder(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    source_kind = models.CharField(max_length=16)
    source_id = models.UUIDField()
    source_version = models.PositiveIntegerField()
    preference_version = models.PositiveIntegerField()
    due_at = models.DateTimeField()
    channel = models.CharField(max_length=12)
    dedup_key = models.CharField(max_length=64, unique=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    version = models.PositiveIntegerField(default=1)
    automatic = models.BooleanField(default=False)
    obligation_snapshot = models.JSONField(null=True)


class Delivery(Record):
    reminder = models.OneToOneField(Reminder, on_delete=models.PROTECT, related_name="delivery")
    encrypted_body = models.TextField(default="")
    state = models.CharField(max_length=24, default="scheduled")
    transport = models.CharField(max_length=16, default="preview")
    attempts = models.PositiveIntegerField(default=0)
    available_at = models.DateTimeField()
    lease_until = models.DateTimeField(null=True)
    provider_id = models.CharField(max_length=80, default="", db_index=True)
    error_code = models.CharField(max_length=64, default="")
    cancelled_at = models.DateTimeField(null=True)

    class Meta:
        indexes = [models.Index(fields=["state", "available_at"])]


class DeliveryEvent(Record):
    delivery = models.ForeignKey(Delivery, on_delete=models.PROTECT, related_name="events")
    state = models.CharField(max_length=24)
    code = models.CharField(max_length=64, default="")
    actor = models.ForeignKey("accounts.User", null=True, on_delete=models.PROTECT)
