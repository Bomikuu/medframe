from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("operations", "0003_appointmentroom_roomparticipant_roommessage_and_more")]
    operations = [
        # Preserve existing authorized sessions; every new patient claim waits for admission.
        migrations.AddField(
            model_name="roomparticipant",
            name="admitted",
            field=models.BooleanField(default=True),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="roomparticipant",
            name="admitted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="roomparticipant", name="admitted_at", field=models.DateTimeField(null=True)
        ),
        migrations.AddField(
            model_name="roomparticipant", name="last_seen_at", field=models.DateTimeField(null=True)
        ),
        migrations.AddField(
            model_name="roomparticipant", name="device_checks", field=models.JSONField(default=dict)
        ),
    ]
