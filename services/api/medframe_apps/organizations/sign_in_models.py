"""Clinic-owned routine staff sign-in requirements."""

from django.conf import settings
from django.db import models
from django.utils import timezone

from medframe_apps.common import Record


class OrganizationSignInPolicy(Record):
    organization = models.OneToOneField(
        "organizations.Organization", on_delete=models.PROTECT, related_name="sign_in_policy"
    )
    mode = models.CharField(
        max_length=16,
        default="strict",
        choices=[
            ("strict", "Strict"),
            ("password", "Password only"),
            ("remember", "Remember for 30 days"),
        ],
    )
    revision = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(default=timezone.now)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(mode__in=["strict", "password", "remember"]),
                name="org_signin_mode_valid",
            )
        ]
