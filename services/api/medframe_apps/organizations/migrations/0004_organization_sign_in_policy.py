import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0003_staffinvitation_encrypted_token"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name="OrganizationSignInPolicy",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(default=django.utils.timezone.now, editable=False),
                ),
                (
                    "mode",
                    models.CharField(
                        choices=[
                            ("strict", "Strict"),
                            ("password", "Password only"),
                            ("remember", "Remember for 30 days"),
                        ],
                        default="strict",
                        max_length=16,
                    ),
                ),
                ("revision", models.PositiveIntegerField(default=1)),
                ("updated_at", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "organization",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="sign_in_policy",
                        to="organizations.organization",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="organizationsigninpolicy",
            constraint=models.CheckConstraint(
                condition=models.Q(mode__in=["strict", "password", "remember"]),
                name="org_signin_mode_valid",
            ),
        ),
    ]
