"""Per-clinic staff settings; absent rows preserve the original membership policy."""

from django.db import models

from medframe_apps.common import Record


class StaffProfile(Record):
    membership = models.OneToOneField("organizations.Membership", on_delete=models.PROTECT)
    display_name = models.CharField(max_length=160, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    workspace_mode = models.CharField(max_length=16, default="full")
    billing_access = models.CharField(max_length=16, default="inherit")
    photo = models.ForeignKey("organizations.StaffPhoto", null=True, on_delete=models.PROTECT)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(workspace_mode__in=["full", "station"]),
                name="staff_workspace_mode",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    billing_access__in=["inherit", "none", "view", "record", "manage"]
                ),
                name="staff_billing_access",
            ),
        ]


class StaffInvitation(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", null=True, on_delete=models.PROTECT)
    email = models.EmailField(max_length=320)
    issued_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    token_hash = models.CharField(max_length=64, unique=True)
    encrypted_token = models.TextField(blank=True)
    roles = models.JSONField(default=list)
    settings = models.JSONField(default=dict)
    progress = models.JSONField(default=dict)
    version = models.PositiveIntegerField(default=1)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True)
    accepted_at = models.DateTimeField(null=True)
    user = models.ForeignKey(
        "accounts.User", null=True, on_delete=models.PROTECT, related_name="staff_invitations"
    )
    proof_hash = models.CharField(max_length=64, blank=True)
    otp_hash = models.CharField(max_length=64, blank=True)
    otp_expires_at = models.DateTimeField(null=True)
    attempts = models.PositiveIntegerField(default=0)
    verified_at = models.DateTimeField(null=True)
    photo = models.ForeignKey("organizations.StaffPhoto", null=True, on_delete=models.PROTECT)


class StaffPhoto(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    membership = models.ForeignKey("organizations.Membership", null=True, on_delete=models.PROTECT)
    invitation = models.ForeignKey(
        "organizations.StaffInvitation", null=True, on_delete=models.PROTECT, related_name="uploads"
    )
    key = models.CharField(max_length=240, unique=True)
    content_type = models.CharField(max_length=64)
    uploaded_by = models.ForeignKey("accounts.User", null=True, on_delete=models.PROTECT)
