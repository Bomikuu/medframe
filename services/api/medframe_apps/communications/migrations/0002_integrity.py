from django.db import migrations

SQL = """
ALTER TABLE communications_delivery ADD CONSTRAINT communication_delivery_values CHECK (
 state IN ('scheduled','sending','accepted','delivered','retryable_failure',
 'permanent_failure','unknown','cancelled','preview') AND attempts <= 5 AND
 transport IN ('preview','twilio','in_app'));
CREATE UNIQUE INDEX communication_provider_sid ON communications_delivery (provider_id)
 WHERE provider_id <> '';
ALTER TABLE communications_reminder ADD CONSTRAINT communication_reminder_values CHECK (
 channel IN ('sms','in_app') AND source_kind IN ('appointment','follow_up','invoice')
 AND source_version > 0 AND preference_version > 0 AND version > 0);
CREATE FUNCTION communication_transport_guard() RETURNS trigger AS $$
BEGIN
 IF NEW.transport <> OLD.transport OR NEW.reminder_id <> OLD.reminder_id THEN
 RAISE EXCEPTION 'Delivery transport and reminder are immutable'; END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER delivery_transport_immutable BEFORE UPDATE ON communications_delivery
 FOR EACH ROW EXECUTE FUNCTION communication_transport_guard();
CREATE FUNCTION communications_append_only() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Delivery history is append only'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER delivery_events_immutable BEFORE UPDATE OR DELETE ON communications_deliveryevent
 FOR EACH ROW EXECUTE FUNCTION communications_append_only();
CREATE FUNCTION communication_scope_guard() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM patients_patient p WHERE p.id=NEW.patient_id
 AND p.organization_id=NEW.organization_id) THEN
 RAISE EXCEPTION 'Communication patient scope mismatch'; END IF;
 IF TG_TABLE_NAME='communications_reminder' THEN
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'version') IS DISTINCT FROM
 (to_jsonb(OLD)-'version') THEN RAISE EXCEPTION 'Reminder source is immutable'; END IF;
 IF NOT EXISTS (SELECT 1 FROM patients_patient p WHERE p.id=NEW.patient_id
 AND p.branch_id=NEW.branch_id) THEN RAISE EXCEPTION 'Communication branch mismatch'; END IF;
 IF NEW.source_kind='appointment' AND NOT EXISTS (SELECT 1 FROM operations_appointment a
 WHERE a.id=NEW.source_id AND a.organization_id=NEW.organization_id
 AND a.patient_id=NEW.patient_id AND a.branch_id=NEW.branch_id) THEN
 RAISE EXCEPTION 'Appointment reminder mismatch'; END IF;
 IF NEW.source_kind='invoice' AND NOT EXISTS (SELECT 1 FROM billing_invoice i
 WHERE i.id=NEW.source_id AND i.organization_id=NEW.organization_id
 AND i.patient_id=NEW.patient_id AND i.branch_id=NEW.branch_id) THEN
 RAISE EXCEPTION 'Invoice reminder mismatch'; END IF;
 IF NEW.source_kind='follow_up' AND NOT EXISTS (SELECT 1 FROM treatments_followup f
 WHERE f.id=NEW.source_id AND f.organization_id=NEW.organization_id
 AND f.patient_id=NEW.patient_id) THEN RAISE EXCEPTION 'Follow-up reminder mismatch'; END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER communication_preference_scope BEFORE INSERT OR UPDATE
 ON communications_communicationpreference FOR EACH ROW EXECUTE FUNCTION
 communication_scope_guard();
CREATE TRIGGER communication_reminder_scope BEFORE INSERT OR UPDATE
 ON communications_reminder FOR EACH ROW EXECUTE FUNCTION communication_scope_guard();"""


class Migration(migrations.Migration):
    dependencies = [("communications", "0001_initial"), ("billing", "0002_integrity_permissions")]
    operations = [migrations.RunSQL(SQL, reverse_sql=None)]
