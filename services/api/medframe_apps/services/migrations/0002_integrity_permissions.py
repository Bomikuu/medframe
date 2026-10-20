from django.db import migrations


def grant_service_permissions(apps, schema_editor):
    ct, _ = apps.get_model("contenttypes", "ContentType").objects.get_or_create(
        app_label="organizations", model="membership"
    )
    for code in ["services.read", "services.work"]:
        permission, _ = apps.get_model("auth", "Permission").objects.get_or_create(
            content_type=ct, codename=code, defaults={"name": code}
        )
        for role in apps.get_model("organizations", "Role").objects.filter(
            name__in=["clinic_administrator", "receptionist", "doctor", "dentist"]
        ):
            role.permissions.add(permission)


SQL = """

ALTER TABLE services_servicedefinition ADD CONSTRAINT service_values CHECK (
 price BETWEEN 1 AND 999999999 AND version > 0 AND months BETWEEN 1 AND 60 AND
payment_mode IN ( 'full' , 'monthly' ) AND jsonb_typeof(workflow)= 'array' AND
 jsonb_array_length(workflow)<=40
AND ((payment_mode= 'full' AND deposit=0) OR (payment_mode= 'monthly' AND deposit<price AND
 price-deposit>=months)));
CREATE FUNCTION service_case_guard() RETURNS trigger AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Service history cannot be deleted'; END IF;
IF NOT EXISTS (SELECT 1 FROM patients_patient p JOIN services_servicedefinition s ON
 s.id=NEW.service_id
 WHERE p.id=NEW.patient_id AND p.organization_id=NEW.organization_id AND p.branch_id=NEW.branch_id
AND s.organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'Service case scope mismatch' ;
 END IF;
IF TG_OP= 'UPDATE' AND (to_jsonb(NEW)- 'version' - 'status' ) IS DISTINCT FROM (to_jsonb(OLD)-
 'version' - 'status' )
 THEN RAISE EXCEPTION 'Service case identity and terms are fixed'; END IF;
IF NEW.status NOT IN ( 'active' , 'completed' , 'cancelled' ) OR NEW.version<1 THEN RAISE
 EXCEPTION 'Invalid service case state' ; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER service_case_integrity BEFORE INSERT OR UPDATE OR DELETE ON
 services_patientservicecase
 FOR EACH ROW EXECUTE FUNCTION service_case_guard();
CREATE FUNCTION service_step_guard() RETURNS trigger AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Workflow history is retained'; END IF;
IF NOT EXISTS (SELECT 1 FROM services_patientservicecase WHERE id=NEW.case_id AND status= 'active'
 ) THEN
 RAISE EXCEPTION 'Workflow is not active'; END IF;
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN
 RAISE EXCEPTION 'Workflow structure is fixed'; END IF;
IF NEW.status NOT IN ( 'pending' , 'in_progress' , 'completed' , 'skipped' ) THEN RAISE EXCEPTION
 'Invalid step state' ; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER service_step_integrity BEFORE INSERT OR UPDATE OR DELETE ON
 services_servicecasestep
 FOR EACH ROW EXECUTE FUNCTION service_step_guard();
CREATE TRIGGER service_events_immutable BEFORE UPDATE OR DELETE ON services_servicecaseevent
 FOR EACH ROW EXECUTE FUNCTION billing_append_only();
CREATE FUNCTION service_branch_guard() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM services_servicedefinition s JOIN organizations_branch b
ON b.id=NEW.branch_id WHERE s.id=NEW.servicedefinition_id AND s.organization_id=b.organization_id)
 THEN RAISE EXCEPTION 'Service branch scope mismatch'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER service_branch_integrity BEFORE INSERT OR UPDATE ON
 services_servicedefinition_branches
 FOR EACH ROW EXECUTE FUNCTION service_branch_guard();
"""


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0001_initial"),
        ("billing", "0005_installmentagreement_case_and_more"),
    ]
    operations = [
        migrations.RunPython(grant_service_permissions, migrations.RunPython.noop),
        migrations.RunSQL(SQL, reverse_sql=None),
    ]
