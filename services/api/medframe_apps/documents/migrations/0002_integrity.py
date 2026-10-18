from django.db import migrations

SQL = """
ALTER TABLE documents_document ADD CONSTRAINT document_patient_org
FOREIGN KEY(patient_id, organization_id) REFERENCES patients_patient(id, organization_id);
ALTER TABLE documents_document ADD CONSTRAINT document_encounter_patient_org
FOREIGN KEY(encounter_id, patient_id, organization_id)
REFERENCES encounters_encounter(id, patient_id, organization_id);
ALTER TABLE documents_document ADD CONSTRAINT document_purpose
CHECK ((purpose = 'clinical' AND patient_id IS NOT NULL) OR
       (purpose IN ('logo','avatar') AND patient_id IS NULL AND encounter_id IS NULL));
CREATE TRIGGER immutable_document BEFORE UPDATE OR DELETE ON documents_document
FOR EACH ROW EXECUTE FUNCTION medframe_immutable();
CREATE FUNCTION medframe_document_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Document versions cannot be deleted'; END IF;
  IF (to_jsonb(NEW) - ARRAY['scan_state','scanned_at','scan_attempts']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['scan_state','scanned_at','scan_attempts'])
     AND OLD.scan_state != 'uploading' THEN
    RAISE EXCEPTION 'Received document bytes and identity are immutable';
  END IF;
  IF OLD.scan_state IN ('clean','rejected') AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Conclusive document scan is immutable';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER document_version_guard BEFORE UPDATE OR DELETE ON documents_documentversion
FOR EACH ROW EXECUTE FUNCTION medframe_document_version_guard();
"""
REVERSE = """
DROP TRIGGER document_version_guard ON documents_documentversion;
DROP FUNCTION medframe_document_version_guard();
DROP TRIGGER immutable_document ON documents_document;
ALTER TABLE documents_document DROP CONSTRAINT document_purpose,
DROP CONSTRAINT document_encounter_patient_org, DROP CONSTRAINT document_patient_org;
"""


class Migration(migrations.Migration):
    dependencies = [("documents", "0001_initial"), ("encounters", "0002_integrity")]
    operations = [migrations.RunSQL(SQL, REVERSE)]
