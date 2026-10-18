from django.db import migrations

SQL = """
ALTER TABLE organizations_branch
ADD CONSTRAINT branch_id_org UNIQUE(id, organization_id);
ALTER TABLE organizations_membership
ADD CONSTRAINT member_id_org UNIQUE(id, organization_id);
ALTER TABLE organizations_membership
ADD CONSTRAINT member_branch_org
FOREIGN KEY(branch_id, organization_id)
REFERENCES organizations_branch(id, organization_id);
ALTER TABLE patients_patient
ADD CONSTRAINT patient_id_org UNIQUE(id, organization_id);
ALTER TABLE patients_patient
ADD CONSTRAINT patient_branch_org
FOREIGN KEY(branch_id, organization_id)
REFERENCES organizations_branch(id, organization_id);
ALTER TABLE patients_patientaccessgrant
ADD CONSTRAINT grant_patient_org
FOREIGN KEY(patient_id, organization_id)
REFERENCES patients_patient(id, organization_id);
ALTER TABLE patients_patientaccessgrant
ADD CONSTRAINT grant_member_org
FOREIGN KEY(membership_id, organization_id)
REFERENCES organizations_membership(id, organization_id);
ALTER TABLE patients_patientclinicalrevision
ADD CONSTRAINT history_patient_org
FOREIGN KEY(patient_id, organization_id)
REFERENCES patients_patient(id, organization_id);
ALTER TABLE patients_patientclinicalrevision
ADD CONSTRAINT history_id_patient_org UNIQUE(id, patient_id, organization_id);
ALTER TABLE patients_patientclinicalrevision
ADD CONSTRAINT history_states CHECK (
  version > 0 AND allergy_state IN ('unreviewed','none_reported','recorded')
  AND medication_state IN ('unreviewed','none_reported','recorded')
  AND ((allergy_state = 'recorded') = (jsonb_array_length(allergies) > 0))
  AND ((medication_state = 'recorded') = (jsonb_array_length(medications) > 0))
);
ALTER TABLE patients_patientevent
ADD CONSTRAINT event_patient_org
FOREIGN KEY(patient_id, organization_id)
REFERENCES patients_patient(id, organization_id);
ALTER TABLE patients_patientevent
ADD CONSTRAINT event_revision_patient_org
FOREIGN KEY(revision_id, patient_id, organization_id)
REFERENCES patients_patientclinicalrevision(id, patient_id, organization_id);
ALTER TABLE patients_patientevent
ADD CONSTRAINT event_member_org
FOREIGN KEY(target_membership_id, organization_id)
REFERENCES organizations_membership(id, organization_id);
ALTER TABLE patients_patientregistrationrequest
ADD CONSTRAINT registration_patient_org
FOREIGN KEY(patient_id, organization_id)
REFERENCES patients_patient(id, organization_id);
CREATE FUNCTION medframe_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable record cannot be modified'; END;
$$;
CREATE TRIGGER immutable_history
BEFORE UPDATE OR DELETE ON patients_patientclinicalrevision
FOR EACH ROW EXECUTE FUNCTION medframe_immutable();
CREATE TRIGGER immutable_patient_events
BEFORE UPDATE OR DELETE ON patients_patientevent
FOR EACH ROW EXECUTE FUNCTION medframe_immutable();
CREATE TRIGGER immutable_audit
BEFORE UPDATE OR DELETE ON auditing_auditevent
FOR EACH ROW EXECUTE FUNCTION medframe_immutable();
"""

REVERSE = """
DROP TRIGGER immutable_audit ON auditing_auditevent;
DROP TRIGGER immutable_patient_events ON patients_patientevent;
DROP TRIGGER immutable_history ON patients_patientclinicalrevision;
DROP FUNCTION medframe_immutable();
ALTER TABLE patients_patientregistrationrequest
DROP CONSTRAINT registration_patient_org;
ALTER TABLE patients_patientevent
DROP CONSTRAINT event_member_org,
DROP CONSTRAINT event_revision_patient_org,
DROP CONSTRAINT event_patient_org;
ALTER TABLE patients_patientclinicalrevision
DROP CONSTRAINT history_states,
DROP CONSTRAINT history_id_patient_org,
DROP CONSTRAINT history_patient_org;
ALTER TABLE patients_patientaccessgrant
DROP CONSTRAINT grant_member_org,
DROP CONSTRAINT grant_patient_org;
ALTER TABLE patients_patient
DROP CONSTRAINT patient_branch_org,
DROP CONSTRAINT patient_id_org;
ALTER TABLE organizations_membership
DROP CONSTRAINT member_branch_org,
DROP CONSTRAINT member_id_org;
ALTER TABLE organizations_branch
DROP CONSTRAINT branch_id_org;
"""


class Migration(migrations.Migration):
    dependencies = [("patients", "0001_initial"), ("auditing", "0002_initial")]
    operations = [migrations.RunSQL(SQL, REVERSE)]
