from config.errors import DomainError
from medframe_apps.billing.installment_projection import invoice_due_projection


def reminder_obligation(invoice, obligation_id):
    due = invoice_due_projection(invoice)
    if not due["is_installment"]:
        if obligation_id:
            raise DomainError("INVALID_INPUT", "This invoice has no installment schedule.")
        return None
    row = next((x for x in due["rows"] if x["id"] == str(obligation_id) and x["remaining"]), None)
    if row is None:
        raise DomainError("CONFLICT", "Choose an unpaid installment for this reminder.", 409)
    return {
        "id": row["id"],
        "date": row["due_date"],
        "amount": row["remaining"],
        "version": invoice.version,
    }


def validate_snapshot(invoice, snapshot):
    current = reminder_obligation(invoice, snapshot["id"] if snapshot else None)
    if current != snapshot:
        raise DomainError("CONFLICT", "This installment changed. Review a new reminder.", 409)
    return current
