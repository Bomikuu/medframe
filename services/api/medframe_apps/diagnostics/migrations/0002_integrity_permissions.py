from django.db import migrations


def grant_permissions(apps, schema_editor):
    content_type, _ = apps.get_model("contenttypes", "ContentType").objects.get_or_create(
        app_label="organizations", model="membership"
    )
    roles = apps.get_model("organizations", "Role")
    roles.objects.get_or_create(name="diagnostic_operator")
    mapping = {
        "diagnostics.read": ["doctor", "dentist"],
        "diagnostics.request": ["doctor", "dentist"],
        "diagnostics.review": ["doctor", "dentist"],
        "diagnostics.partners.manage": ["clinic_administrator"],
        "diagnostics.center.work": ["diagnostic_operator"],
        "workspace.read": ["diagnostic_operator"],
    }
    for code, names in mapping.items():
        permission, _ = apps.get_model("auth", "Permission").objects.get_or_create(
            content_type=content_type, codename=code, defaults={"name": code}
        )
        for role in roles.objects.filter(name__in=names):
            role.permissions.add(permission)


SQL = """
ALTER TABLE diagnostics_diagnosticrequest ADD CONSTRAINT diagnostic_patient_scope
 FOREIGN KEY(patient_id,organization_id) REFERENCES patients_patient(id,organization_id);
ALTER TABLE diagnostics_diagnosticrequest ADD CONSTRAINT diagnostic_encounter_scope
FOREIGN KEY(encounter_id,patient_id,organization_id) REFERENCES
 encounters_encounter(id,patient_id,organization_id);
ALTER TABLE diagnostics_diagnosticrequest ADD CONSTRAINT diagnostic_request_state CHECK(
version>0 AND state IN ( 'draft' , 'awaiting_center' , 'sent' , 'accepted' , 'performed' ,
 'results_available' , 'reviewed' , 'cancelled' ));
ALTER TABLE diagnostics_resultrevision ADD CONSTRAINT diagnostic_report_length CHECK(
 length(report)<=12000 AND length(reason)<=240 AND sequence>0);
ALTER TABLE diagnostics_resultreview ADD CONSTRAINT diagnostic_review_length CHECK(
 length(interpretation) BETWEEN 1 AND 4000 AND length(next_steps)<=2000);
CREATE FUNCTION diagnostic_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r diagnostics_diagnosticrequest; a diagnostics_diagnosticassignment;
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
  SELECT * INTO r FROM diagnostics_diagnosticrequest WHERE id=NEW.request_id;
IF r.state<> 'draft' OR NOT EXISTS(SELECT 1 FROM documents_documentversion v JOIN
 documents_document d ON d.id=v.document_id WHERE v.id=NEW.version_id AND
 d.organization_id=r.organization_id AND d.patient_id=r.patient_id AND d.purpose= 'clinical' AND
 v.scan_state= 'clean' ) THEN RAISE EXCEPTION 'Request file mismatch' ; END IF;
 ELSIF TG_TABLE_NAME='diagnostics_resultrevision' THEN
  SELECT * INTO a FROM diagnostics_diagnosticassignment WHERE id=NEW.assignment_id;
  SELECT * INTO r FROM diagnostics_diagnosticrequest WHERE id=NEW.request_id;
IF a.request_id IS DISTINCT FROM NEW.request_id OR NOT a.active OR r.assignment_id IS DISTINCT
 FROM a.id OR r.state<> 'performed' OR NEW.performed_at IS DISTINCT FROM a.performed_at THEN
 RAISE EXCEPTION 'Result assignment mismatch' ; END IF;
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
CREATE FUNCTION diagnostic_attachment_delete_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
IF EXISTS(SELECT 1 FROM diagnostics_diagnosticrequest WHERE id=OLD.request_id AND state<>
 'draft' ) THEN RAISE EXCEPTION 'Issued attachments immutable' ; END IF;
 RETURN OLD;
END; $$;
CREATE TRIGGER request_file_delete BEFORE DELETE ON diagnostics_requestattachment FOR EACH ROW
 EXECUTE FUNCTION diagnostic_attachment_delete_guard();
"""
for table in [
    "diagnosticrequest",
    "diagnosticassignment",
    "requestattachment",
    "resultrevision",
    "resultdraftattachment",
    "resultattachment",
    "resultreview",
]:
    SQL += (
        f"CREATE TRIGGER diagnostic_scope BEFORE INSERT OR UPDATE ON diagnostics_{table} "
        "FOR EACH ROW EXECUTE FUNCTION diagnostic_scope_guard();\n"
    )
for table in [
    "requestrevision",
    "diagnosticevent",
    "partnershipevent",
    "resultrevision",
    "resultattachment",
    "resultreview",
    "resultdraftattachment",
]:
    SQL += (
        f"CREATE TRIGGER diagnostic_immutable BEFORE UPDATE OR DELETE ON diagnostics_{table} "
        "FOR EACH ROW EXECUTE FUNCTION medframe_immutable();\n"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("diagnostics", "0001_initial"),
        ("patients", "0002_integrity"),
        ("encounters", "0002_integrity"),
    ]
    operations = [
        migrations.RunPython(grant_permissions, migrations.RunPython.noop),
        migrations.RunSQL(SQL),
    ]
