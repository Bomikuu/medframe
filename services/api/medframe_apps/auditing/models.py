from django.db import models

from medframe_apps.common import Record


class AuditEvent(Record):
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT, null=True)
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.PROTECT, null=True
    )
    action = models.CharField(max_length=100)
    resource_id = models.UUIDField(null=True)
    outcome = models.CharField(max_length=32, default="success")
    request_id = models.CharField(max_length=64, default="system")


class Notification(Record):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    kind = models.CharField(max_length=40)
    resource_id = models.UUIDField()
    read_at = models.DateTimeField(null=True)
