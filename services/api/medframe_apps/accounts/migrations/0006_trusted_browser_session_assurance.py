import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0005_google_identity")]
    operations = [
        migrations.CreateModel(
            name="TrustedBrowser",
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
                ("token_hash", models.CharField(max_length=64, unique=True)),
                ("auth_epoch", models.PositiveIntegerField()),
                ("policy_fingerprint", models.CharField(max_length=64)),
                ("expires_at", models.DateTimeField()),
                ("revoked", models.BooleanField(default=False)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name="clinicalsession",
            name="auth_method",
            field=models.CharField(default="mfa", max_length=16),
        ),
        migrations.AddField(
            model_name="clinicalsession",
            name="auth_epoch",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="clinicalsession",
            name="policy_fingerprint",
            field=models.CharField(default="", max_length=64),
        ),
        migrations.AddField(
            model_name="clinicalsession",
            name="trusted_browser",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="accounts.trustedbrowser",
            ),
        ),
    ]
