from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("stations", "0006_kioskevent_kioskproof_kioskpatientsession_and_more")]
    operations = [
        migrations.RunSQL(
            """
        CREATE TRIGGER station_kiosk_event_append_only
        BEFORE UPDATE OR DELETE ON stations_kioskevent
        FOR EACH ROW EXECUTE FUNCTION station_event_immutable();

        CREATE FUNCTION station_kiosk_scope_guard() RETURNS trigger AS $$
        BEGIN
          IF TG_TABLE_NAME = 'stations_kioskproof' THEN
            IF NOT EXISTS (SELECT 1 FROM patients_patient p WHERE p.id=NEW.patient_id AND
          p.branch_id=NEW.branch_id)
              OR (NEW.membership_id IS NULL) = (NEW.portal_link_id IS NULL) THEN
              RAISE EXCEPTION 'Kiosk patient proof scope mismatch';
            END IF;
            IF NEW.membership_id IS NOT NULL AND NOT EXISTS (
              SELECT 1 FROM organizations_membership m JOIN organizations_branch b ON
          b.organization_id=m.organization_id
              WHERE m.id=NEW.membership_id AND m.user_id=NEW.issued_by_id AND b.id=NEW.branch_id
                AND (m.branch_id IS NULL OR m.branch_id=b.id)) THEN
              RAISE EXCEPTION 'Kiosk issuer scope mismatch';
            END IF;
            IF NEW.portal_link_id IS NOT NULL AND NOT EXISTS (
              SELECT 1 FROM portal_portallink l WHERE l.id=NEW.portal_link_id AND
          l.patient_id=NEW.patient_id AND l.user_id=NEW.issued_by_id) THEN
              RAISE EXCEPTION 'Kiosk portal link mismatch';
            END IF;
          ELSIF TG_TABLE_NAME = 'stations_kioskpatientsession' THEN
            IF NOT EXISTS (SELECT 1 FROM stations_kioskproof p
              JOIN stations_devicecredential c ON c.id=NEW.credential_id
              JOIN stations_stationdevice d ON d.id=c.device_id
              WHERE p.id=NEW.proof_id AND p.branch_id=d.branch_id AND d.mode='kiosk') THEN
              RAISE EXCEPTION 'Kiosk session device scope mismatch';
            END IF;
          ELSIF TG_TABLE_NAME = 'stations_stationvisit' THEN
            IF NOT EXISTS (SELECT 1 FROM patients_patient p WHERE p.id=NEW.patient_id AND
          p.branch_id=NEW.branch_id) THEN
              RAISE EXCEPTION 'Station visit scope mismatch';
            END IF;
          ELSIF TG_TABLE_NAME = 'stations_visitstage' THEN
            IF NOT EXISTS (SELECT 1 FROM stations_stationvisit v JOIN stations_stationdepartment
          d ON d.id=NEW.department_id
              WHERE v.id=NEW.visit_id AND v.branch_id=d.branch_id) THEN
              RAISE EXCEPTION 'Station stage department scope mismatch';
            END IF;
            IF NEW.previous_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM stations_visitstage s
          WHERE s.id=NEW.previous_id AND s.visit_id=NEW.visit_id) THEN
              RAISE EXCEPTION 'Station transfer visit mismatch';
            END IF;
            IF NEW.queue_ticket_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM
          operations_queueticket q
              JOIN operations_queueday qd ON qd.id=q.day_id JOIN stations_stationvisit v ON
          v.id=NEW.visit_id
              JOIN stations_stationdepartment d ON d.id=NEW.department_id
              WHERE q.id=NEW.queue_ticket_id AND q.patient_id=v.patient_id AND
          qd.branch_id=v.branch_id AND qd.date=v.date AND d.kind='consultation') THEN
              RAISE EXCEPTION 'Station consultation queue scope mismatch';
            END IF;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        CREATE TRIGGER station_proof_scope BEFORE INSERT OR UPDATE ON stations_kioskproof FOR
          EACH ROW EXECUTE FUNCTION station_kiosk_scope_guard();
        CREATE TRIGGER station_patient_session_scope BEFORE INSERT OR UPDATE ON
          stations_kioskpatientsession FOR EACH ROW EXECUTE FUNCTION station_kiosk_scope_guard();
        CREATE TRIGGER station_visit_scope BEFORE INSERT OR UPDATE ON stations_stationvisit FOR
          EACH ROW EXECUTE FUNCTION station_kiosk_scope_guard();
        CREATE TRIGGER station_stage_scope BEFORE INSERT OR UPDATE ON stations_visitstage FOR
          EACH ROW EXECUTE FUNCTION station_kiosk_scope_guard();
        """,
            """
        DROP TRIGGER IF EXISTS station_kiosk_event_append_only ON stations_kioskevent;
        DROP TRIGGER IF EXISTS station_proof_scope ON stations_kioskproof;
        DROP TRIGGER IF EXISTS station_patient_session_scope ON stations_kioskpatientsession;
        DROP TRIGGER IF EXISTS station_visit_scope ON stations_stationvisit;
        DROP TRIGGER IF EXISTS station_stage_scope ON stations_visitstage;
        DROP FUNCTION IF EXISTS station_kiosk_scope_guard();
        """,
        )
    ]
