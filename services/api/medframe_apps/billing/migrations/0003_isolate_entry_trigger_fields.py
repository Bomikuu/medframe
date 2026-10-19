"""Repair ledger posting without changing the already-applied integrity migration."""

from django.db import migrations

SQL = """
CREATE OR REPLACE FUNCTION billing_entry_guard() RETURNS trigger AS $$
DECLARE
    inv_id uuid;
    inv billing_invoice;
    paid bigint;
    refunded bigint;
    credited bigint;
    payment_amount bigint;
    payment_refunds bigint;
BEGIN
    IF TG_TABLE_NAME = 'billing_refund' THEN
        SELECT invoice_id, amount INTO inv_id, payment_amount
        FROM billing_payment WHERE id = NEW.payment_id;
    ELSIF TG_TABLE_NAME IN ('billing_payment', 'billing_creditnote') THEN
        inv_id := NEW.invoice_id;
    ELSE
        RAISE EXCEPTION 'Unsupported financial entry table';
    END IF;

    SELECT * INTO inv FROM billing_invoice WHERE id = inv_id FOR UPDATE;
    IF inv.state IS DISTINCT FROM 'issued' THEN
        RAISE EXCEPTION 'Financial entry needs an issued invoice';
    END IF;

    SELECT coalesce(sum(amount), 0) INTO paid
    FROM billing_payment WHERE invoice_id = inv_id;
    SELECT coalesce(sum(r.amount), 0) INTO refunded
    FROM billing_refund r JOIN billing_payment p ON p.id = r.payment_id
    WHERE p.invoice_id = inv_id;
    SELECT coalesce(sum(amount), 0) INTO credited
    FROM billing_creditnote WHERE invoice_id = inv_id;

    IF TG_TABLE_NAME = 'billing_payment' THEN
        IF NEW.amount > inv.total - credited - paid + refunded THEN
            RAISE EXCEPTION 'Payment exceeds balance';
        END IF;
    ELSIF TG_TABLE_NAME = 'billing_creditnote' THEN
        IF NEW.amount > inv.total - credited THEN
            RAISE EXCEPTION 'Credit exceeds charge';
        END IF;
    ELSIF TG_TABLE_NAME = 'billing_refund' THEN
        SELECT coalesce(sum(amount), 0) INTO payment_refunds
        FROM billing_refund WHERE payment_id = NEW.payment_id;
        IF NEW.amount > payment_amount - payment_refunds THEN
            RAISE EXCEPTION 'Refund exceeds payment';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""


class Migration(migrations.Migration):
    dependencies = [("billing", "0002_integrity_permissions")]
    operations = [migrations.RunSQL(SQL, reverse_sql=None)]
