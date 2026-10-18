from django.db import models

from medframe_apps.common import Record


class OrganizationBranding(Record):
    organization = models.OneToOneField("organizations.Organization", on_delete=models.PROTECT)
    settings = models.JSONField(default=dict)
    version = models.PositiveIntegerField(default=1)


class UserPreferences(Record):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    settings = models.JSONField(default=dict)
    widgets = models.JSONField(default=list)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "organization"], name="user_preferences_org")
        ]
