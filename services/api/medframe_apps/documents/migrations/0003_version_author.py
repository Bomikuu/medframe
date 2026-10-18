import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0002_integrity"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.AddField(
            model_name="documentversion",
            name="uploaded_by",
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.RunSQL(
            "ALTER TABLE documents_documentversion DISABLE TRIGGER document_version_guard;"
            " UPDATE documents_documentversion v SET uploaded_by_id = d.uploaded_by_id"
            " FROM documents_document d WHERE d.id = v.document_id;"
            " ALTER TABLE documents_documentversion ENABLE TRIGGER document_version_guard;",
            migrations.RunSQL.noop,
        ),
        migrations.AlterField(
            model_name="documentversion",
            name="uploaded_by",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL
            ),
        ),
    ]
