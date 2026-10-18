from django.db import migrations

SQL = """
CREATE FUNCTION medframe_portal_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='portal_portalinvitation' THEN
  IF (NEW.organization_id,NEW.patient_id,NEW.email,NEW.relationship,NEW.method,NEW.note,
      NEW.token_hash,NEW.expires_at,NEW.issued_by_id,NEW.created_at)
     IS DISTINCT FROM
     (OLD.organization_id,OLD.patient_id,OLD.email,OLD.relationship,OLD.method,OLD.note,
      OLD.token_hash,OLD.expires_at,OLD.issued_by_id,OLD.created_at)
  THEN RAISE EXCEPTION 'Invitation identity and verification are immutable'; END IF;
  IF OLD.consumed_at IS NOT NULL AND NEW.consumed_at IS DISTINCT FROM OLD.consumed_at
  THEN RAISE EXCEPTION 'Consumed invitation is immutable'; END IF;
  IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS NULL
  THEN RAISE EXCEPTION 'Revoked invitation cannot be restored'; END IF;
 ELSE
  IF (NEW.organization_id,NEW.patient_id,NEW.user_id,NEW.relationship,NEW.invitation_id,
      NEW.created_at) IS DISTINCT FROM
     (OLD.organization_id,OLD.patient_id,OLD.user_id,OLD.relationship,OLD.invitation_id,
      OLD.created_at)
  THEN RAISE EXCEPTION 'Patient relationship identity is immutable'; END IF;
  IF NOT OLD.active AND NEW.active
  THEN RAISE EXCEPTION 'Revoked relationship requires a new verified invitation'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER portal_identity BEFORE UPDATE ON portal_portalinvitation
FOR EACH ROW EXECUTE FUNCTION medframe_portal_identity_guard();
CREATE TRIGGER portal_identity BEFORE UPDATE ON portal_portallink
FOR EACH ROW EXECUTE FUNCTION medframe_portal_identity_guard();
"""
REVERSE = """
DROP TRIGGER portal_identity ON portal_portallink;
DROP TRIGGER portal_identity ON portal_portalinvitation;
DROP FUNCTION medframe_portal_identity_guard();
"""


class Migration(migrations.Migration):
    dependencies = [("portal", "0002_integrity")]
    operations = [migrations.RunSQL(SQL, REVERSE)]
