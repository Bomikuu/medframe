import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("providers", "0001_initial"), ("onboarding", "0002_specialty_reference")]
    operations = [
        migrations.CreateModel(
            name="SpecialtyConfiguration",
            fields=[
                (
                    "organization",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.PROTECT,
                        primary_key=True,
                        serialize=False,
                        to="organizations.organization",
                    ),
                ),
                ("version", models.PositiveIntegerField(default=1)),
            ],
        ),
    ]
