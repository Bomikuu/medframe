from django.db import migrations

TABLES = [
    "encounters_encounterrevision",
    "encounters_diagnosis",
    "encounters_clinicalnote",
    "encounters_observation",
    "encounters_encountertimelinelink",
    "dental_toothfinding",
    "dental_dentalchartrevision",
    "treatments_procedure",
    "treatments_treatmentplanevent",
]
SQL = """
ALTER TABLE encounters_encounter
ADD CONSTRAINT encounter_id_patient_org UNIQUE(id, patient_id, organization_id);
ALTER TABLE encounters_encounter
ADD CONSTRAINT encounter_patient_org
FOREIGN KEY(patient_id, organization_id)
REFERENCES patients_patient(id, organization_id);
ALTER TABLE encounters_encounter
ADD CONSTRAINT encounter_branch_org
FOREIGN KEY(branch_id, organization_id)
REFERENCES organizations_branch(id, organization_id);
ALTER TABLE encounters_encounterrevision
ADD CONSTRAINT revision_encounter_patient_org
FOREIGN KEY(encounter_id, patient_id, organization_id)
REFERENCES encounters_encounter(id, patient_id, organization_id);
ALTER TABLE treatments_treatmentplan
ADD CONSTRAINT plan_patient_org
FOREIGN KEY(patient_id, organization_id)
REFERENCES patients_patient(id, organization_id);
""" + "\n".join(
    f"CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON {table} "
    "FOR EACH ROW EXECUTE FUNCTION medframe_immutable();"
    for table in TABLES
)
REVERSE = (
    "\n".join(f"DROP TRIGGER immutable_record ON {table};" for table in TABLES)
    + """
ALTER TABLE treatments_treatmentplan DROP CONSTRAINT plan_patient_org;
ALTER TABLE encounters_encounterrevision DROP CONSTRAINT revision_encounter_patient_org;
ALTER TABLE encounters_encounter DROP CONSTRAINT encounter_branch_org,
DROP CONSTRAINT encounter_patient_org, DROP CONSTRAINT encounter_id_patient_org;
"""
)


class Migration(migrations.Migration):
    dependencies = [
        ("encounters", "0001_initial"),
        ("patients", "0002_integrity"),
        ("dental", "0002_initial"),
        ("treatments", "0001_initial"),
    ]
    operations = [migrations.RunSQL(SQL, REVERSE)]
