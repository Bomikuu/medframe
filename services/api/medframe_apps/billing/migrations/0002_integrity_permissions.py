from django.db import migrations


def permissions(apps, schema_editor):
    role_model = apps.get_model("organizations", "Role")
    permission_model = apps.get_model("auth", "Permission")
    content_type, _ = apps.get_model("contenttypes", "ContentType").objects.get_or_create(
        app_label="organizations", model="membership"
    )
    for code in [
        "billing.read",
        "billing.manage",
        "payments.record",
        "billing.adjust",
        "communications.manage",
    ]:
        permission, _ = permission_model.objects.get_or_create(
            content_type=content_type, codename=code, defaults={"name": code}
        )
        names = (
            ["clinic_administrator"]
            if code == "billing.adjust"
            else ["clinic_administrator", "receptionist"]
        )
        for role in role_model.objects.filter(name__in=names):
            role.permissions.add(permission)


SQL = """
ALTER TABLE billing_invoice ADD CONSTRAINT billing_invoice_values CHECK (
 state IN ('draft','issued','void') AND version > 0 AND currency='PHP' AND
 subtotal <= 999999999 AND discount <= subtotal AND total=subtotal-discount AND
 discount_kind IN ('fixed','percent') AND
 (state='draft' OR (number IS NOT NULL AND issued_at IS NOT NULL AND issued_by_id IS NOT NULL)));
ALTER TABLE billing_invoiceline ADD CONSTRAINT billing_line_values CHECK (
 quantity BETWEEN 1 AND 999 AND unit_amount <= 999999999 AND
 kind IN ('consultation','procedure','other') AND length(description) > 0);
ALTER TABLE billing_payment ADD CONSTRAINT billing_payment_values CHECK (
 amount BETWEEN 1 AND 999999999 AND method IN ('cash','bank_transfer','other'));
ALTER TABLE billing_refund ADD CONSTRAINT billing_refund_values CHECK (
 amount BETWEEN 1 AND 999999999 AND length(reason) > 0);
ALTER TABLE billing_creditnote ADD CONSTRAINT billing_credit_values CHECK (
 amount BETWEEN 1 AND 999999999 AND length(reason) > 0);
CREATE FUNCTION billing_append_only() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Financial history is append only'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER financial_events_immutable BEFORE UPDATE OR DELETE ON billing_financialevent
 FOR EACH ROW EXECUTE FUNCTION billing_append_only();
CREATE TRIGGER financial_payments_immutable BEFORE UPDATE OR DELETE ON billing_payment
 FOR EACH ROW EXECUTE FUNCTION billing_append_only();
CREATE TRIGGER financial_refunds_immutable BEFORE UPDATE OR DELETE ON billing_refund
 FOR EACH ROW EXECUTE FUNCTION billing_append_only();
CREATE TRIGGER financial_credits_immutable BEFORE UPDATE OR DELETE ON billing_creditnote
 FOR EACH ROW EXECUTE FUNCTION billing_append_only();
CREATE FUNCTION billing_invoice_guard() RETURNS trigger AS $$
DECLARE line_sum bigint;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Invoices cannot be deleted'; END IF;
 IF NOT EXISTS (SELECT 1 FROM patients_patient p JOIN organizations_branch b
 ON b.id=p.branch_id WHERE p.id=NEW.patient_id AND p.organization_id=NEW.organization_id
 AND b.organization_id=NEW.organization_id AND b.id=NEW.branch_id) THEN
 RAISE EXCEPTION 'Invoice scope mismatch'; END IF;
 IF NEW.encounter_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM encounters_encounter e
 WHERE e.id=NEW.encounter_id AND e.organization_id=NEW.organization_id
 AND e.patient_id=NEW.patient_id AND e.branch_id=NEW.branch_id) THEN
 RAISE EXCEPTION 'Invoice encounter mismatch'; END IF;
 IF TG_OP='UPDATE' AND OLD.state <> 'draft' THEN
 IF (to_jsonb(NEW)-'version'-'state') IS DISTINCT FROM
 (to_jsonb(OLD)-'version'-'state') THEN RAISE EXCEPTION 'Issued invoice is immutable'; END IF;
 IF NEW.state <> OLD.state AND NOT (OLD.state='issued' AND NEW.state='void' AND
 NOT EXISTS (SELECT 1 FROM billing_payment WHERE invoice_id=OLD.id) AND
 NOT EXISTS (SELECT 1 FROM billing_creditnote WHERE invoice_id=OLD.id)) THEN
 RAISE EXCEPTION 'Invalid invoice transition'; END IF;
 END IF;
 IF NEW.state='issued' AND (TG_OP='INSERT' OR OLD.state='draft') THEN
 SELECT coalesce(sum(quantity*unit_amount),0) INTO line_sum FROM billing_invoiceline
 WHERE invoice_id=NEW.id;
 IF line_sum <> NEW.subtotal OR NEW.total <= 0 THEN
 RAISE EXCEPTION 'Invoice calculation mismatch'; END IF;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER billing_invoice_integrity BEFORE INSERT OR UPDATE OR DELETE ON billing_invoice
 FOR EACH ROW EXECUTE FUNCTION billing_invoice_guard();
CREATE FUNCTION billing_line_guard() RETURNS trigger AS $$
DECLARE inv billing_invoice;
BEGIN
 SELECT * INTO inv FROM billing_invoice WHERE id=CASE WHEN TG_OP='DELETE'
 THEN OLD.invoice_id ELSE NEW.invoice_id END FOR UPDATE;
 IF inv.state <> 'draft' THEN RAISE EXCEPTION 'Issued lines are immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND OLD.invoice_id <> NEW.invoice_id THEN
 RAISE EXCEPTION 'Invoice line cannot move'; END IF;
 IF NEW.procedure_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM treatments_procedure p
 JOIN encounters_encounterrevision r ON r.id=p.revision_id JOIN encounters_encounter e
 ON e.id=r.encounter_id WHERE p.id=NEW.procedure_id AND e.organization_id=inv.organization_id
 AND e.patient_id=inv.patient_id AND e.branch_id=inv.branch_id) THEN
 RAISE EXCEPTION 'Procedure scope mismatch'; END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER billing_line_integrity BEFORE INSERT OR UPDATE OR DELETE ON billing_invoiceline
 FOR EACH ROW EXECUTE FUNCTION billing_line_guard();
CREATE FUNCTION billing_entry_guard() RETURNS trigger AS $$
DECLARE inv_id uuid; inv billing_invoice; paid bigint; refunded bigint; credited bigint;
 payment_amount bigint;
BEGIN
 IF TG_TABLE_NAME='billing_refund' THEN
 SELECT invoice_id,amount INTO inv_id,payment_amount FROM billing_payment WHERE id=NEW.payment_id;
 ELSE inv_id := NEW.invoice_id; END IF;
 SELECT * INTO inv FROM billing_invoice WHERE id=inv_id FOR UPDATE;
 IF inv.state <> 'issued' THEN RAISE EXCEPTION 'Financial entry needs an issued invoice'; END IF;
 SELECT coalesce(sum(amount),0) INTO paid FROM billing_payment WHERE invoice_id=inv_id;
 SELECT coalesce(sum(r.amount),0) INTO refunded FROM billing_refund r JOIN billing_payment p
 ON p.id=r.payment_id WHERE p.invoice_id=inv_id;
 SELECT coalesce(sum(amount),0) INTO credited FROM billing_creditnote WHERE invoice_id=inv_id;
 IF TG_TABLE_NAME='billing_payment' AND NEW.amount > inv.total-credited-paid+refunded THEN
 RAISE EXCEPTION 'Payment exceeds balance'; END IF;
 IF TG_TABLE_NAME='billing_creditnote' AND NEW.amount > inv.total-credited THEN
 RAISE EXCEPTION 'Credit exceeds charge'; END IF;
 IF TG_TABLE_NAME='billing_refund' AND NEW.amount > payment_amount-
 (SELECT coalesce(sum(amount),0) FROM billing_refund WHERE payment_id=NEW.payment_id) THEN
 RAISE EXCEPTION 'Refund exceeds payment'; END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER billing_payment_integrity BEFORE INSERT ON billing_payment FOR EACH ROW
 EXECUTE FUNCTION billing_entry_guard();
CREATE TRIGGER billing_refund_integrity BEFORE INSERT ON billing_refund FOR EACH ROW
 EXECUTE FUNCTION billing_entry_guard();
CREATE TRIGGER billing_credit_integrity BEFORE INSERT ON billing_creditnote FOR EACH ROW
 EXECUTE FUNCTION billing_entry_guard();
ALTER TABLE billing_billingsettings ADD CONSTRAINT billing_settings_values
 CHECK (currency='PHP' AND next_number > 0 AND version > 0);"""


class Migration(migrations.Migration):
    dependencies = [("billing", "0001_initial")]
    operations = [
        migrations.RunPython(permissions, migrations.RunPython.noop),
        migrations.RunSQL(SQL, reverse_sql=None),
    ]
