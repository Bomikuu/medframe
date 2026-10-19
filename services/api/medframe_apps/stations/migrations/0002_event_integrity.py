from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("stations", "0001_initial")]

    operations = [
        migrations.RunSQL(
            """
            CREATE FUNCTION station_event_immutable() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'Station events are append-only';
            END;
            $$ LANGUAGE plpgsql;
            CREATE TRIGGER station_event_append_only
            BEFORE UPDATE OR DELETE ON stations_stationevent
            FOR EACH ROW EXECUTE FUNCTION station_event_immutable();
            """,
            """
            DROP TRIGGER IF EXISTS station_event_append_only ON stations_stationevent;
            DROP FUNCTION IF EXISTS station_event_immutable();
            """,
        )
    ]
