from django.db import migrations


def permissions(apps, schema_editor):
    Role = apps.get_model("organizations", "Role")
    Permission = apps.get_model("auth", "Permission")
    ContentType = apps.get_model("contenttypes", "ContentType")
    content_type, _ = ContentType.objects.get_or_create(
        app_label="organizations", model="membership"
    )
    for code in ("operations.read", "appointments.manage", "queues.manage", "schedules.manage"):
        permission, _ = Permission.objects.get_or_create(
            content_type=content_type, codename=code, defaults={"name": code}
        )
        names = (
            ["clinic_administrator"]
            if code == "schedules.manage"
            else ["clinic_administrator", "receptionist", "doctor", "dentist"]
        )
        for role in Role.objects.filter(name__in=names):
            role.permissions.add(permission)


SQL = """
ALTER TABLE operations_providerschedule ADD CONSTRAINT operations_schedule_values CHECK (weekday
    BETWEEN 0 AND 6 AND opens < closes AND effective_from <= effective_to AND duration BETWEEN 5
    AND 240 AND duration % 5 = 0);
ALTER TABLE operations_appointment ADD CONSTRAINT operations_appointment_values CHECK ("start" <
    "end" AND status IN ('booked','checked_in','in_service','completed','cancelled','no_show')
    AND type IN ('routine','follow_up'));
ALTER TABLE operations_queueticket ADD CONSTRAINT operations_ticket_values CHECK (status IN
    ('waiting','called','in_service','completed','cancelled','no_show') AND duration BETWEEN 5
    AND 240 AND duration % 5 = 0 AND delay <= 240);
ALTER TABLE operations_reservation ADD CONSTRAINT operations_period_values CHECK (NOT
    isempty(period) AND NOT lower_inf(period) AND NOT upper_inf(period) AND lower_inc(period)
    AND NOT upper_inc(period));
CREATE FUNCTION operations_immutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Operational history is append only'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER operations_events_immutable BEFORE UPDATE OR DELETE ON operations_operationsevent
    FOR EACH ROW EXECUTE FUNCTION operations_immutable();
CREATE FUNCTION operations_scope_guard() RETURNS trigger AS $$
DECLARE org uuid; branch uuid; provider uuid; patient uuid; resource uuid; provider_user uuid;
    expected_user uuid;
BEGIN
IF TG_TABLE_NAME = 'operations_providerschedule' THEN
branch := NEW.branch_id; provider := NEW.provider_id;
ELSIF TG_TABLE_NAME = 'operations_scheduleoverride' THEN
branch := NEW.branch_id; provider := NEW.provider_id;
ELSIF TG_TABLE_NAME = 'operations_appointment' THEN
branch := NEW.branch_id; org := NEW.organization_id; provider := NEW.provider_id; patient :=
    NEW.patient_id; resource := NEW.resource_id;
ELSIF TG_TABLE_NAME = 'operations_queueticket' THEN
SELECT branch_id INTO branch FROM operations_queueday WHERE id=NEW.day_id;
provider := NEW.provider_id; patient := NEW.patient_id; resource := NEW.resource_id;
IF NEW.appointment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM operations_appointment a WHERE
    a.id=NEW.appointment_id AND a.branch_id=branch AND a.patient_id=patient AND
    a.provider_id=provider AND a.resource_id IS NOT DISTINCT FROM resource) THEN RAISE EXCEPTION
    'Queue appointment scope mismatch'; END IF;
IF NEW.encounter_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM encounters_encounter e WHERE
    e.id=NEW.encounter_id AND e.branch_id=branch AND e.patient_id=patient AND
    e.provider_id=provider) THEN RAISE EXCEPTION 'Queue encounter scope mismatch'; END IF;
SELECT m.user_id INTO expected_user FROM providers_providerprofile p JOIN
    organizations_membership m ON m.id=p.membership_id WHERE p.id=provider;
IF NEW.status='in_service' AND (NEW.service_user_id IS DISTINCT FROM expected_user OR
    NEW.service_start IS NULL) THEN RAISE EXCEPTION 'Queue service owner mismatch'; END IF;
ELSIF TG_TABLE_NAME = 'operations_reservation' THEN
branch := NEW.branch_id; org := NEW.organization_id; patient := NEW.patient_id; resource :=
    NEW.resource_id; provider_user := NEW.provider_user_id;
IF NEW.appointment_id IS NOT NULL THEN
IF NOT EXISTS (SELECT 1 FROM operations_appointment a JOIN providers_providerprofile p ON
    p.id=a.provider_id JOIN organizations_membership m ON m.id=p.membership_id WHERE
    a.id=NEW.appointment_id AND a.branch_id=branch AND a.patient_id=patient AND a.resource_id IS
    NOT DISTINCT FROM resource AND m.user_id=provider_user) THEN RAISE EXCEPTION
    'Appointment reservation scope mismatch'; END IF;
ELSE
IF NOT EXISTS (SELECT 1 FROM operations_queueticket t JOIN operations_queueday d ON
    d.id=t.day_id JOIN providers_providerprofile p ON p.id=t.provider_id JOIN
    organizations_membership m ON m.id=p.membership_id WHERE t.id=NEW.ticket_id AND
    d.branch_id=branch AND t.patient_id=patient AND t.resource_id IS NOT DISTINCT FROM resource
    AND m.user_id=provider_user) THEN RAISE EXCEPTION 'Queue reservation scope mismatch'; END
    IF;
END IF;
END IF;
IF branch IS NOT NULL THEN
IF org IS NOT NULL AND NOT EXISTS (SELECT 1 FROM organizations_branch b WHERE b.id=branch AND
    b.organization_id=org) THEN RAISE EXCEPTION 'Operations clinic mismatch'; END IF;
IF patient IS NOT NULL AND NOT EXISTS (SELECT 1 FROM patients_patient p WHERE p.id=patient AND
    p.branch_id=branch) THEN RAISE EXCEPTION 'Operations patient branch mismatch'; END IF;
IF resource IS NOT NULL AND NOT EXISTS (SELECT 1 FROM operations_branchresource r WHERE
    r.id=resource AND r.branch_id=branch) THEN RAISE EXCEPTION
    'Operations resource branch mismatch'; END IF;
IF provider IS NOT NULL AND NOT EXISTS (SELECT 1 FROM providers_providerprofile p JOIN
    organizations_membership m ON m.id=p.membership_id JOIN organizations_branch b ON
    b.id=branch WHERE p.id=provider AND m.organization_id=b.organization_id AND (m.branch_id IS
    NULL OR m.branch_id=branch)) THEN RAISE EXCEPTION 'Operations provider branch mismatch'; END
    IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER operations_schedule_scope BEFORE INSERT OR UPDATE ON operations_providerschedule
    FOR EACH ROW EXECUTE FUNCTION operations_scope_guard();
CREATE TRIGGER operations_override_scope BEFORE INSERT OR UPDATE ON operations_scheduleoverride
    FOR EACH ROW EXECUTE FUNCTION operations_scope_guard();
CREATE TRIGGER operations_appointment_scope BEFORE INSERT OR UPDATE ON operations_appointment
    FOR EACH ROW EXECUTE FUNCTION operations_scope_guard();
CREATE TRIGGER operations_ticket_scope BEFORE INSERT OR UPDATE ON operations_queueticket FOR
    EACH ROW EXECUTE FUNCTION operations_scope_guard();
CREATE TRIGGER operations_reservation_scope BEFORE INSERT OR UPDATE ON operations_reservation
    FOR EACH ROW EXECUTE FUNCTION operations_scope_guard();
"""


class Migration(migrations.Migration):
    dependencies = [("operations", "0001_initial")]
    operations = [
        migrations.RunPython(permissions, migrations.RunPython.noop),
        migrations.RunSQL(SQL, reverse_sql=None),
    ]
