from django.db import migrations


def seed(apps, schema_editor):
    from django.utils.text import slugify

    Specialty = apps.get_model("onboarding", "MedicalSpecialty")
    groups = {
        "dental": [
            "General Dentistry",
            "Orthodontics",
            "Oral Surgery",
            "Endodontics",
            "Periodontics",
            "Pediatric Dentistry",
            "Prosthodontics",
        ],
        "medicine": [
            "General Practice",
            "Family Medicine",
            "Internal Medicine",
            "Pediatrics",
            "Dermatology",
            "Cardiology",
            "Orthopedics",
        ],
    }
    for category, names in groups.items():
        for name in names:
            Specialty.objects.get_or_create(
                code=slugify(name).replace("-", "_"), defaults={"name": name, "category": category}
            )


class Migration(migrations.Migration):
    dependencies = [("onboarding", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
