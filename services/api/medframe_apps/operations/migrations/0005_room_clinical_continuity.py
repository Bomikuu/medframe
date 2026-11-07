import uuid

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("operations", "0004_roomparticipant_admission"),
        ("encounters", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.AddField(
            model_name="appointmentroom",
            name="encounter",
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.PROTECT, to="encounters.encounter"
            ),
        ),
        migrations.CreateModel(
            name="RoomAftercare",
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
                ("generation", models.PositiveIntegerField()),
                ("next_steps", models.CharField(max_length=2000)),
                ("follow_up", models.CharField(default="", max_length=500)),
                (
                    "author",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL
                    ),
                ),
                (
                    "room",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="aftercare",
                        to="operations.appointmentroom",
                    ),
                ),
            ],
        ),
    ]
