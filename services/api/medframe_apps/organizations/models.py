from django.contrib.auth.models import Permission
from django.db import models

from medframe_apps.common import Record


class Organization(Record):
    name = models.CharField(max_length=160, unique=True)
    clinic_type = models.CharField(max_length=40, default="dental")
    timezone = models.CharField(max_length=64, default="Asia/Manila")
    active = models.BooleanField(default=True)


class Branch(Record):
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT)
    name = models.CharField(max_length=160)


class Role(models.Model):
    name = models.CharField(max_length=64, primary_key=True)
    permissions = models.ManyToManyField(Permission)


class Membership(Record):
    user = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT)
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True)
    active = models.BooleanField(default=True)
    roles = models.ManyToManyField(Role)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "organization"], name="membership_user_org")
        ]


from .staff_models import StaffInvitation, StaffPhoto, StaffProfile  # noqa: E402,F401
from .sign_in_models import OrganizationSignInPolicy  # noqa: E402,F401
