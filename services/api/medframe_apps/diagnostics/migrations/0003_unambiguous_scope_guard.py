from django.db import migrations

SQL = """
CREATE OR REPLACE FUNCTION diagnostic_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE request_row diagnostics_diagnosticrequest; assignment_row diagnostics_diagnosticassignment;
BEGIN
 IF TG_TABLE_NAME='diagnostics_diagnosticrequest' THEN
IF NOT EXISTS(SELECT 1 FROM patients_patient p WHERE p.id=NEW.patient_id AND
 p.organization_id=NEW.organization_id AND p.branch_id=NEW.branch_id)
OR NOT EXISTS(SELECT 1 FROM providers_providerprofile p JOIN organizations_membership m ON
 m.id=p.membership_id WHERE p.id=NEW.provider_id AND m.organization_id=NEW.organization_id)
   THEN RAISE EXCEPTION 'Diagnostic request scope mismatch'; END IF;
IF NEW.assignment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM diagnostics_diagnosticassignment a
 WHERE a.id=NEW.assignment_id AND a.request_id=NEW.id) THEN RAISE EXCEPTION
 'Assignment mismatch' ; END IF;
IF NEW.current_result_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM diagnostics_resultrevision v
 WHERE v.id=NEW.current_result_id AND v.request_id=NEW.id) THEN RAISE EXCEPTION
 'Result mismatch' ; END IF;
  IF TG_OP='UPDATE' THEN
IF OLD.state<> 'draft' AND
 (NEW.organization_id,NEW.patient_id,NEW.branch_id,NEW.provider_id,NEW.encounter_id,NEW.details,NEW.package,NEW.number)
 IS DISTINCT FROM
 (OLD.organization_id,OLD.patient_id,OLD.branch_id,OLD.provider_id,OLD.encounter_id,OLD.details,OLD.package,OLD.number)
 THEN RAISE EXCEPTION 'Issued diagnostic request is immutable' ; END IF;
  END IF;
 ELSIF TG_TABLE_NAME='diagnostics_diagnosticassignment' THEN
IF NOT EXISTS(SELECT 1 FROM diagnostics_diagnosticrequest r JOIN
 diagnostics_diagnosticpartnership p ON p.id=NEW.partnership_id WHERE r.id=NEW.request_id AND
 r.organization_id=p.organization_id) THEN RAISE EXCEPTION 'Partner scope mismatch' ; END IF;
IF TG_OP= 'UPDATE' AND (NEW.request_id,NEW.partnership_id,NEW.actor_id,NEW.reason) IS DISTINCT
 FROM (OLD.request_id,OLD.partnership_id,OLD.actor_id,OLD.reason) THEN RAISE EXCEPTION
 'Assignment identity immutable' ; END IF;
 ELSIF TG_TABLE_NAME='diagnostics_requestattachment' THEN
  SELECT * INTO request_row FROM diagnostics_diagnosticrequest WHERE id=NEW.request_id;
IF request_row.state<> 'draft' OR NOT EXISTS(SELECT 1 FROM documents_documentversion v JOIN
 documents_document d ON d.id=v.document_id WHERE v.id=NEW.version_id AND
 d.organization_id=request_row.organization_id AND d.patient_id=request_row.patient_id AND
 d.purpose= 'clinical' AND v.scan_state= 'clean' ) THEN RAISE EXCEPTION 'Request file mismatch'
 ; END IF;
 ELSIF TG_TABLE_NAME='diagnostics_resultrevision' THEN
  SELECT * INTO assignment_row FROM diagnostics_diagnosticassignment WHERE id=NEW.assignment_id;
  SELECT * INTO request_row FROM diagnostics_diagnosticrequest WHERE id=NEW.request_id;
IF assignment_row.request_id IS DISTINCT FROM NEW.request_id OR NOT assignment_row.active OR
 request_row.assignment_id IS DISTINCT FROM assignment_row.id OR request_row.state<> 'performed'
 OR NEW.performed_at IS DISTINCT FROM assignment_row.performed_at THEN RAISE EXCEPTION
 'Result assignment mismatch' ; END IF;
 ELSIF TG_TABLE_NAME='diagnostics_resultdraftattachment' THEN
IF NOT EXISTS(SELECT 1 FROM diagnostics_resultdraft f JOIN diagnostics_diagnosticassignment a ON
 a.id=f.assignment_id JOIN diagnostics_diagnosticrequest r ON r.id=a.request_id JOIN
 documents_documentversion v ON v.id=NEW.version_id JOIN documents_document d ON
 d.id=v.document_id WHERE f.id=NEW.draft_id AND r.assignment_id=a.id AND a.active AND r.state=
 'performed' AND d.organization_id=r.organization_id AND d.patient_id=r.patient_id AND
 d.purpose= 'diagnostic' ) THEN RAISE EXCEPTION 'Result draft file mismatch' ; END IF;
 ELSIF TG_TABLE_NAME='diagnostics_resultattachment' THEN
IF NOT EXISTS(SELECT 1 FROM diagnostics_resultrevision s JOIN diagnostics_resultdraft f ON
 f.assignment_id=s.assignment_id JOIN diagnostics_resultdraftattachment a ON a.draft_id=f.id
 JOIN documents_documentversion v ON v.id=a.version_id WHERE s.id=NEW.result_id AND
 a.version_id=NEW.version_id AND v.scan_state= 'clean' ) THEN RAISE EXCEPTION
 'Submitted file mismatch' ; END IF;
 ELSIF TG_TABLE_NAME='diagnostics_resultreview' THEN
IF NOT EXISTS(SELECT 1 FROM diagnostics_resultrevision v JOIN diagnostics_diagnosticrequest r ON
 r.id=v.request_id WHERE v.id=NEW.result_id AND r.current_result_id=v.id AND r.state=
 'results_available' ) THEN RAISE EXCEPTION 'Review must target current result' ; END IF;
 END IF;
 RETURN NEW;
END; $$;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("diagnostics", "0002_integrity_permissions"),
        ("documents", "0004_diagnostic_purpose"),
    ]
    operations = [migrations.RunSQL(SQL)]
