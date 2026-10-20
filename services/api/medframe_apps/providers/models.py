from django.db import models

from medframe_apps.common import Record


class ProviderProfile(Record):
    membership = models.OneToOneField("organizations.Membership", on_delete=models.PROTECT)
    specialty = models.CharField(max_length=40, default="general_medicine")
    professional_title = models.CharField(max_length=120, default="")
    credential_status = models.CharField(max_length=32, default="not_verified")


class SpecialtyConfiguration(models.Model):
    organization = models.OneToOneField(
        "organizations.Organization", primary_key=True, on_delete=models.PROTECT
    )
    version = models.PositiveIntegerField(default=1)
