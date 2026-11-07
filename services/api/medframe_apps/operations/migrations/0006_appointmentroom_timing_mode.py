from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("operations", "0005_room_clinical_continuity")]

    operations = [
        migrations.AddField(
            model_name="appointmentroom",
            name="timing_mode",
            field=models.CharField(
                choices=[("scheduled", "Scheduled"), ("instant", "Instant")],
                default="scheduled",
                max_length=12,
            ),
        ),
    ]
