from django.db import migrations

SQL = """

ALTER TABLE billing_installmentobligation ADD CONSTRAINT installment_positive CHECK
 (amount BETWEEN 1 AND 999999999 AND position BETWEEN 0 AND 60 AND kind IN ('deposit','monthly'));
CREATE FUNCTION installment_agreement_guard() RETURNS trigger AS $$
DECLARE inv billing_invoice; source_case services_patientservicecase;
BEGIN
SELECT * INTO inv FROM billing_invoice WHERE id=CASE WHEN TG_OP= 'DELETE' THEN OLD.invoice_id ELSE
 NEW.invoice_id END FOR UPDATE;
 IF inv.state<>'draft' THEN RAISE EXCEPTION 'Issued agreement is immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
IF TG_OP= 'UPDATE' AND (NEW.invoice_id<>OLD.invoice_id OR NEW.case_id<>OLD.case_id) THEN RAISE
 EXCEPTION 'Agreement identity is fixed' ; END IF;
 SELECT * INTO source_case FROM services_patientservicecase WHERE id=NEW.case_id;
IF source_case.organization_id<>inv.organization_id OR source_case.branch_id<>inv.branch_id OR
 source_case.patient_id<>inv.patient_id
 THEN RAISE EXCEPTION 'Agreement case scope mismatch'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER installment_agreement_integrity BEFORE INSERT OR UPDATE OR DELETE ON
 billing_installmentagreement
 FOR EACH ROW EXECUTE FUNCTION installment_agreement_guard();
CREATE FUNCTION installment_obligation_guard() RETURNS trigger AS $$
DECLARE inv billing_invoice;
BEGIN
SELECT i.* INTO inv FROM billing_invoice i JOIN billing_installmentagreement a ON
 a.invoice_id=i.id
WHERE a.id=CASE WHEN TG_OP= 'DELETE' THEN OLD.agreement_id ELSE NEW.agreement_id END FOR UPDATE OF
 i;
 IF inv.state<>'draft' THEN RAISE EXCEPTION 'Issued obligations are immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
IF TG_OP= 'UPDATE' AND NEW.agreement_id<>OLD.agreement_id THEN RAISE EXCEPTION
 'Obligation cannot move' ; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER installment_obligation_integrity BEFORE INSERT OR UPDATE OR DELETE ON
 billing_installmentobligation
 FOR EACH ROW EXECUTE FUNCTION installment_obligation_guard();
CREATE FUNCTION installment_sum_guard() RETURNS trigger AS $$
DECLARE inv_id uuid; inv billing_invoice; agreement billing_installmentagreement; total_sum
 bigint; row_count int;
BEGIN
 IF TG_TABLE_NAME='billing_invoice' THEN inv_id:=coalesce(NEW.id,OLD.id);
ELSIF TG_TABLE_NAME= 'billing_installmentagreement' THEN
 inv_id:=coalesce(NEW.invoice_id,OLD.invoice_id);
ELSE SELECT invoice_id INTO inv_id FROM billing_installmentagreement WHERE
 id=coalesce(NEW.agreement_id,OLD.agreement_id); END IF;
 SELECT * INTO inv FROM billing_invoice WHERE id=inv_id;
 SELECT * INTO agreement FROM billing_installmentagreement WHERE invoice_id=inv_id;
 IF agreement.id IS NOT NULL AND inv.state IN ('issued','void') THEN
SELECT coalesce(sum(amount),0), count(*) INTO total_sum,row_count FROM
 billing_installmentobligation WHERE agreement_id=agreement.id;
IF total_sum<>inv.total OR row_count<1 OR row_count>61 OR agreement.confirmed_at IS NULL OR
 agreement.confirmed_by_id IS NULL OR length(agreement.confirmed_digest)<>64
OR inv.due_date<>(SELECT max(due_date) FROM billing_installmentobligation WHERE
 agreement_id=agreement.id)
 OR (SELECT count(*) FROM billing_invoiceline WHERE invoice_id=inv_id)<>1
 THEN RAISE EXCEPTION 'Issued installment agreement does not reconcile'; END IF;
 END IF;
 RETURN NULL;
END; $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER installment_invoice_sum AFTER INSERT OR UPDATE ON billing_invoice
 DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION installment_sum_guard();
CREATE CONSTRAINT TRIGGER installment_agreement_sum AFTER INSERT OR UPDATE OR DELETE ON
 billing_installmentagreement DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION installment_sum_guard();
CREATE CONSTRAINT TRIGGER installment_obligation_sum AFTER INSERT OR UPDATE OR DELETE ON
 billing_installmentobligation DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION installment_sum_guard();
CREATE FUNCTION billing_service_source_guard() RETURNS trigger AS $$
DECLARE inv billing_invoice; service_org uuid;
BEGIN
 SELECT i.* INTO inv FROM billing_invoice i JOIN billing_invoiceline l ON l.invoice_id=i.id
 WHERE l.id=CASE WHEN TG_OP='DELETE' THEN OLD.line_id ELSE NEW.line_id END FOR UPDATE OF i;
 IF inv.state<>'draft' THEN RAISE EXCEPTION 'Issued source terms are immutable'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 SELECT organization_id INTO service_org FROM services_servicedefinition WHERE id=NEW.service_id;
 IF service_org<>inv.organization_id THEN RAISE EXCEPTION 'Service charge scope mismatch'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER billing_service_source_integrity BEFORE INSERT OR UPDATE OR DELETE ON
 billing_invoicelineservicesource
 FOR EACH ROW EXECUTE FUNCTION billing_service_source_guard();
"""


class Migration(migrations.Migration):
    dependencies = [
        ("billing", "0005_installmentagreement_case_and_more"),
        ("services", "0002_integrity_permissions"),
    ]
    operations = [migrations.RunSQL(SQL, reverse_sql=None)]
