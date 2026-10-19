from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("websites", "0002_publication_integrity"),
        ("documents", "0004_diagnostic_purpose"),
    ]
    operations = [
        migrations.RunSQL(
            """
        ALTER TABLE documents_document DROP CONSTRAINT document_purpose;
        ALTER TABLE documents_document ADD CONSTRAINT document_purpose CHECK(
          (purpose IN ('clinical','diagnostic') AND patient_id IS NOT NULL) OR
          (purpose IN ('logo','avatar','website') AND patient_id IS NULL AND encounter_id IS NULL));
        """,
            """
        ALTER TABLE documents_document DROP CONSTRAINT document_purpose;
        ALTER TABLE documents_document ADD CONSTRAINT document_purpose CHECK(
          (purpose IN ('clinical','diagnostic') AND patient_id IS NOT NULL) OR
          (purpose IN ('logo','avatar') AND patient_id IS NULL AND encounter_id IS NULL));
        """,
        )
    ]
