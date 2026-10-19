from django.db import migrations

TABLES = [
    "anatomy_anatomyfindingidentity",
    "anatomy_anatomyfinding",
    "anatomy_anatomychartrevision",
    "anatomy_anatomychartentry",
]
SQL = """
ALTER TABLE anatomy_anatomyfindingidentity ADD CONSTRAINT anatomy_identity_patient_org
FOREIGN KEY(patient_id, organization_id) REFERENCES patients_patient(id, organization_id);
CREATE FUNCTION medframe_anatomy_finding_scope() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM anatomy_anatomyfindingidentity AS identity_row
 JOIN encounters_encounterrevision AS revision_row ON revision_row.id = NEW.revision_id
 WHERE identity_row.id = NEW.identity_id AND identity_row.patient_id = revision_row.patient_id
 AND identity_row.organization_id = revision_row.organization_id) THEN
 RAISE EXCEPTION 'Anatomical finding scope mismatch';
 END IF;
 IF NEW.content->>'key' IS DISTINCT FROM NEW.identity_id::text
 OR NEW.content->>'structure_id' IS DISTINCT FROM NEW.structure_id
 OR NEW.content->>'side' IS DISTINCT FROM NEW.side
 OR NEW.content->>'layer' IS DISTINCT FROM NEW.layer
 OR NEW.content->>'status' IS DISTINCT FROM NEW.status THEN
 RAISE EXCEPTION 'Anatomical finding index mismatch'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER anatomy_finding_scope BEFORE INSERT ON anatomy_anatomyfinding
FOR EACH ROW EXECUTE FUNCTION medframe_anatomy_finding_scope();
CREATE FUNCTION medframe_anatomy_entry_scope() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM anatomy_anatomychartrevision AS chart_row
 JOIN encounters_encounterrevision AS chart_revision ON chart_revision.id = chart_row.revision_id
 JOIN anatomy_anatomyfinding AS finding_row ON finding_row.id = NEW.finding_id
 JOIN encounters_encounterrevision AS finding_revision
 ON finding_revision.id = finding_row.revision_id
 WHERE chart_row.id = NEW.chart_id AND chart_revision.patient_id = finding_revision.patient_id
 AND chart_revision.organization_id = finding_revision.organization_id
 AND finding_revision.created_at <= chart_revision.created_at) THEN
 RAISE EXCEPTION 'Anatomical chart entry scope mismatch'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER anatomy_entry_scope BEFORE INSERT ON anatomy_anatomychartentry
FOR EACH ROW EXECUTE FUNCTION medframe_anatomy_entry_scope();
""" + "\n".join(
    f"CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON {table} "
    "FOR EACH ROW EXECUTE FUNCTION medframe_immutable();"
    for table in TABLES
)
REVERSE = (
    "\n".join(f"DROP TRIGGER immutable_record ON {table};" for table in TABLES)
    + """
DROP TRIGGER anatomy_entry_scope ON anatomy_anatomychartentry;
DROP FUNCTION medframe_anatomy_entry_scope();
DROP TRIGGER anatomy_finding_scope ON anatomy_anatomyfinding;
DROP FUNCTION medframe_anatomy_finding_scope();
ALTER TABLE anatomy_anatomyfindingidentity DROP CONSTRAINT anatomy_identity_patient_org;
"""
)


class Migration(migrations.Migration):
    dependencies = [("anatomy", "0001_initial"), ("encounters", "0002_integrity")]
    operations = [migrations.RunSQL(SQL, REVERSE)]
