from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("websites", "0001_initial")]
    operations = [
        migrations.RunSQL(
            """
        CREATE FUNCTION medframe_website_publication_immutable() RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'Website publications are immutable';
        END;
        $$ LANGUAGE plpgsql;
        CREATE TRIGGER website_publication_immutable
        BEFORE UPDATE OR DELETE ON websites_websitepublication
        FOR EACH ROW EXECUTE FUNCTION medframe_website_publication_immutable();
        """,
            """
        DROP TRIGGER website_publication_immutable ON websites_websitepublication;
        DROP FUNCTION medframe_website_publication_immutable();
        """,
        )
    ]
