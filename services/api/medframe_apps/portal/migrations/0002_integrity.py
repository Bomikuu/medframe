from django.db import migrations


def grant_default_permission(apps, schema_editor):
    Role = apps.get_model("organizations", "Role")
    Permission = apps.get_model("auth", "Permission")
    ContentType = apps.get_model("contenttypes", "ContentType")
    content_type, _ = ContentType.objects.get_or_create(
        app_label="organizations", model="membership"
    )
    permission, _ = Permission.objects.get_or_create(
        content_type=content_type, codename="portal.manage", defaults={"name": "portal.manage"}
    )
    for role in Role.objects.filter(name__in=["clinic_administrator", "doctor", "dentist"]):
        codes = set(role.permissions.values_list("codename", flat=True))
        required = {"workspace.read", "patients.demographics.read"}
        if required <= codes and (
            "patients.directory.manage" in codes or "patients.clinical.read" in codes
        ):
            role.permissions.add(permission)


SQL = """
ALTER TABLE portal_portallink ADD CONSTRAINT portal_link_scope
UNIQUE(id,patient_id,organization_id);
ALTER TABLE portal_portalrelease ADD CONSTRAINT portal_release_scope
UNIQUE(id,patient_id,organization_id);
ALTER TABLE portal_portalinvitation ADD CONSTRAINT portal_invitation_scope
UNIQUE(id,patient_id,organization_id);
ALTER TABLE portal_portallink ADD CONSTRAINT portal_link_patient FOREIGN
KEY(patient_id,organization_id) REFERENCES patients_patient(id,organization_id);
ALTER TABLE portal_portalinvitation ADD CONSTRAINT portal_invitation_patient FOREIGN
KEY(patient_id,organization_id) REFERENCES patients_patient(id,organization_id);
ALTER TABLE portal_portallink ADD CONSTRAINT portal_link_invitation FOREIGN
KEY(invitation_id,patient_id,organization_id) REFERENCES
portal_portalinvitation(id,patient_id,organization_id);
ALTER TABLE portal_portalrelease ADD CONSTRAINT portal_release_patient FOREIGN
KEY(patient_id,organization_id) REFERENCES patients_patient(id,organization_id);
ALTER TABLE portal_patientreport ADD CONSTRAINT portal_report_link FOREIGN
KEY(link_id,patient_id,organization_id) REFERENCES
portal_portallink(id,patient_id,organization_id);
ALTER TABLE portal_portallink ADD CONSTRAINT portal_relationship CHECK(relationship IN
('self','guardian') AND version > 0);
ALTER TABLE portal_portalinvitation ADD CONSTRAINT portal_verification CHECK(relationship IN
('self','guardian') AND method IN
('in_person','clinic_verified_existing_identity','verified_guardian_authority') AND
(relationship <> 'guardian' OR method='verified_guardian_authority'));
ALTER TABLE portal_releaseevent ADD CONSTRAINT portal_release_state CHECK(state IN
('published','withdrawn') AND version > 0);
ALTER TABLE portal_patientreport ADD CONSTRAINT portal_report_bounds CHECK(category IN
('history','allergy','medication','other') AND length(text) BETWEEN 1 AND 6000 AND
octet_length(text) <= 12288);
ALTER TABLE portal_reportreview ADD CONSTRAINT portal_review_state CHECK(state IN
('received','acknowledged','reviewed') AND version > 0);
CREATE FUNCTION medframe_portal_evidence_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='portal_releasedocument' THEN
  IF NOT EXISTS(SELECT 1 FROM portal_portalrelease r JOIN documents_documentversion v ON
v.id=NEW.version_id JOIN documents_document d ON d.id=v.document_id WHERE r.id=NEW.release_id
AND r.organization_id=d.organization_id AND r.patient_id=d.patient_id AND d.purpose='clinical'
AND v.scan_state='clean') THEN RAISE EXCEPTION 'Release document scope mismatch'; END IF;
 ELSE
  IF NEW.history_revision_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM portal_patientreport r
JOIN patients_patientclinicalrevision h ON h.id=NEW.history_revision_id WHERE r.id=NEW.report_id
AND r.organization_id=h.organization_id AND r.patient_id=h.patient_id) THEN RAISE EXCEPTION
'Report history scope mismatch'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER portal_evidence_scope BEFORE INSERT ON portal_releasedocument FOR EACH ROW
EXECUTE FUNCTION medframe_portal_evidence_scope();
CREATE TRIGGER portal_evidence_scope BEFORE INSERT ON portal_reportreview FOR EACH ROW EXECUTE
FUNCTION medframe_portal_evidence_scope();
"""
IMMUTABLE = [
    "portalaccessevent",
    "portalrelease",
    "releaseevent",
    "releasedocument",
    "patientreport",
    "reportreview",
]
for table in IMMUTABLE:
    SQL += (f"CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON portal_{table} "
            "FOR EACH ROW EXECUTE FUNCTION medframe_immutable();\n")


REVERSE = """
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM portal_portalinvitation) OR EXISTS(SELECT 1 FROM portal_portalrelease)
OR EXISTS(SELECT 1 FROM portal_patientreport) THEN
  RAISE EXCEPTION 'Reconcile portal records before reversing this migration';
 END IF;
END; $$;
DROP TRIGGER portal_evidence_scope ON portal_releasedocument;
DROP TRIGGER portal_evidence_scope ON portal_reportreview;
DROP FUNCTION medframe_portal_evidence_scope();
ALTER TABLE portal_reportreview DROP CONSTRAINT portal_review_state;
ALTER TABLE portal_patientreport DROP CONSTRAINT portal_report_bounds, DROP CONSTRAINT
portal_report_link;
ALTER TABLE portal_releaseevent DROP CONSTRAINT portal_release_state;
ALTER TABLE portal_portallink DROP CONSTRAINT portal_relationship, DROP CONSTRAINT
portal_link_invitation, DROP CONSTRAINT portal_link_patient, DROP CONSTRAINT portal_link_scope;
ALTER TABLE portal_portalinvitation DROP CONSTRAINT portal_verification, DROP CONSTRAINT
portal_invitation_patient, DROP CONSTRAINT portal_invitation_scope;
ALTER TABLE portal_portalrelease DROP CONSTRAINT portal_release_patient, DROP CONSTRAINT
portal_release_scope;
"""
for table in IMMUTABLE:
    REVERSE += f"DROP TRIGGER immutable_record ON portal_{table};\n"


class Migration(migrations.Migration):
    dependencies = [
        ("portal", "0001_initial"),
        ("patients", "0002_integrity"),
        ("accounts", "0004_mailoutbox_kind"),
        ("treatments", "0003_work_integrity"),
        ("encounters", "0004_template_integrity"),
    ]
    operations = [
        migrations.RunPython(grant_default_permission, migrations.RunPython.noop),
        migrations.RunSQL(SQL, REVERSE),
    ]
