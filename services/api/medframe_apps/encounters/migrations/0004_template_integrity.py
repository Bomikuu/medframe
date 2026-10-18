from django.db import migrations

SQL = """
ALTER TABLE encounters_consultationtemplate ADD CONSTRAINT template_id_org
UNIQUE(id,organization_id);
ALTER TABLE encounters_templaterevision ADD CONSTRAINT template_revision_id_org
UNIQUE(id,organization_id);
ALTER TABLE encounters_templaterevision ADD CONSTRAINT template_revision_org
FOREIGN KEY(template_id,organization_id) REFERENCES
encounters_consultationtemplate(id,organization_id);
ALTER TABLE encounters_encounter ADD CONSTRAINT encounter_id_org UNIQUE(id,organization_id);
ALTER TABLE encounters_templateapplication ADD CONSTRAINT application_encounter_org
FOREIGN KEY(encounter_id,organization_id) REFERENCES encounters_encounter(id,organization_id);
ALTER TABLE encounters_templateapplication ADD CONSTRAINT application_template_org
FOREIGN KEY(revision_id,organization_id) REFERENCES encounters_templaterevision(id,organization_id);
CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON encounters_templaterevision
FOR EACH ROW EXECUTE FUNCTION medframe_immutable();
CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON encounters_templateapplication
FOR EACH ROW EXECUTE FUNCTION medframe_immutable();
CREATE FUNCTION medframe_draft_template_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.template_revision_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM encounters_templaterevision t JOIN encounters_encounter e
   ON t.organization_id=e.organization_id WHERE t.id=NEW.template_revision_id AND
e.id=NEW.encounter_id
 ) THEN RAISE EXCEPTION 'Template and encounter scope mismatch'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER draft_template_scope BEFORE INSERT OR UPDATE ON encounters_encounterdraft
FOR EACH ROW EXECUTE FUNCTION medframe_draft_template_scope();
"""
REVERSE = """
DROP TRIGGER draft_template_scope ON encounters_encounterdraft;
DROP FUNCTION medframe_draft_template_scope();
DROP TRIGGER immutable_record ON encounters_templateapplication;
DROP TRIGGER immutable_record ON encounters_templaterevision;
ALTER TABLE encounters_templateapplication DROP CONSTRAINT application_template_org, DROP
CONSTRAINT application_encounter_org;
ALTER TABLE encounters_encounter DROP CONSTRAINT encounter_id_org;
ALTER TABLE encounters_templaterevision DROP CONSTRAINT template_revision_org, DROP CONSTRAINT
template_revision_id_org;
ALTER TABLE encounters_consultationtemplate DROP CONSTRAINT template_id_org;
"""


class Migration(migrations.Migration):
    dependencies = [("encounters", "0003_consultationtemplate_templaterevision_and_more")]
    operations = [migrations.RunSQL(SQL, REVERSE)]
