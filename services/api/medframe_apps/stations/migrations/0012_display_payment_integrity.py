from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("stations", "0011_display_payment_operations")]
    operations = [
        migrations.RunSQL(
            """
            CREATE FUNCTION station_payment_invoice_scope_guard() RETURNS trigger AS $$
            BEGIN
              IF NEW.payment_invoice_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM billing_invoice i
                JOIN stations_stationvisit v ON v.id=NEW.visit_id
                JOIN organizations_branch b ON b.id=v.branch_id
                WHERE i.id=NEW.payment_invoice_id AND i.patient_id=v.patient_id
                  AND i.branch_id=v.branch_id AND i.organization_id=b.organization_id
              ) THEN
                RAISE EXCEPTION 'Station payment invoice scope mismatch';
              END IF;
              RETURN NEW;
            END; $$ LANGUAGE plpgsql;
            CREATE TRIGGER station_payment_invoice_scope
            BEFORE INSERT OR UPDATE ON stations_visitstage
            FOR EACH ROW EXECUTE FUNCTION station_payment_invoice_scope_guard();

            CREATE FUNCTION station_display_settings_guard() RETURNS trigger AS $$
            DECLARE item jsonb;
            BEGIN
              IF jsonb_typeof(NEW.announcements) <> 'array'
                OR jsonb_array_length(NEW.announcements) > 3 THEN
                RAISE EXCEPTION 'Station display notice bounds';
              END IF;
              FOR item IN SELECT value FROM jsonb_array_elements(NEW.announcements) LOOP
                IF jsonb_typeof(item) <> 'string' OR char_length(item #>> '{}') > 240 THEN
                  RAISE EXCEPTION 'Station display notice type or length';
                END IF;
              END LOOP;
              RETURN NEW;
            END; $$ LANGUAGE plpgsql;
            CREATE TRIGGER station_display_settings_bounds
            BEFORE INSERT OR UPDATE ON stations_stationdisplaysettings
            FOR EACH ROW EXECUTE FUNCTION station_display_settings_guard();
            """,
            """
            DROP TRIGGER IF EXISTS station_payment_invoice_scope ON stations_visitstage;
            DROP FUNCTION IF EXISTS station_payment_invoice_scope_guard();
            DROP TRIGGER IF EXISTS station_display_settings_bounds
              ON stations_stationdisplaysettings;
            DROP FUNCTION IF EXISTS station_display_settings_guard();
            """,
        )
    ]
