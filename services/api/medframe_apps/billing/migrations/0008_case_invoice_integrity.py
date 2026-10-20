from django.db import migrations

SQL = """

CREATE FUNCTION service_invoice_link_guard() RETURNS trigger AS $$
DECLARE inv billing_invoice; c services_patientservicecase;
BEGIN
IF TG_OP= 'DELETE' OR TG_OP= 'UPDATE' THEN RAISE EXCEPTION 'Service invoice identity is fixed' ;
 END IF;
 SELECT * INTO inv FROM billing_invoice WHERE id=NEW.invoice_id FOR UPDATE;
 SELECT * INTO c FROM services_patientservicecase WHERE id=NEW.case_id;
IF inv.state<> 'draft' OR c.patient_id<>inv.patient_id OR c.organization_id<>inv.organization_id
 OR c.branch_id<>inv.branch_id
 THEN RAISE EXCEPTION 'Service invoice scope mismatch'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER service_invoice_link_integrity BEFORE INSERT OR UPDATE OR DELETE ON
 billing_servicecaseinvoice
 FOR EACH ROW EXECUTE FUNCTION service_invoice_link_guard();
"""


class Migration(migrations.Migration):
    dependencies = [("billing", "0007_servicecaseinvoice")]
    operations = [migrations.RunSQL(SQL, reverse_sql=None)]
