from django.db import migrations

SQL = """
ALTER TABLE documents_document DROP CONSTRAINT document_purpose;
ALTER TABLE documents_document ADD CONSTRAINT document_purpose CHECK(
 (purpose IN ('clinical','diagnostic') AND patient_id IS NOT NULL) OR
 (purpose IN ('logo','avatar') AND patient_id IS NULL AND encounter_id IS NULL));
CREATE OR REPLACE FUNCTION medframe_portal_evidence_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='portal_releasedocument' THEN
  IF NOT EXISTS(SELECT 1 FROM portal_portalrelease r JOIN documents_documentversion v ON
v.id=NEW.version_id JOIN documents_document d ON d.id=v.document_id WHERE r.id=NEW.release_id
AND r.organization_id=d.organization_id AND r.patient_id=d.patient_id AND v.scan_state='clean'
AND (d.purpose='clinical' OR (d.purpose='diagnostic' AND EXISTS(
 SELECT 1 FROM jsonb_array_elements(r.payload->'diagnostics') x
 JOIN diagnostics_resultrevision s ON s.id::text=x->>'id'
 JOIN diagnostics_resultattachment a ON a.result_id=s.id
 JOIN diagnostics_resultreview w ON w.result_id=s.id
WHERE a.version_id=v.id AND s.request_id IN (SELECT id FROM diagnostics_diagnosticrequest WHERE
 organization_id=r.organization_id AND patient_id=r.patient_id)
)))) THEN RAISE EXCEPTION 'Release document scope mismatch'; END IF;
 ELSE
  IF NEW.history_revision_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM portal_patientreport r
JOIN patients_patientclinicalrevision h ON h.id=NEW.history_revision_id WHERE r.id=NEW.report_id
AND r.organization_id=h.organization_id AND r.patient_id=h.patient_id) THEN RAISE EXCEPTION
'Report history scope mismatch'; END IF;
 END IF;
 RETURN NEW;
END; $$;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0003_version_author"),
        ("diagnostics", "0002_integrity_permissions"),
        ("portal", "0003_identity_guards"),
    ]
    operations = [migrations.RunSQL(SQL)]
