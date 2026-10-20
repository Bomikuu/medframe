from medframe_apps.billing.calculations import amount_text
from medframe_apps.services.policy import financial


def service_data(row, *, prices=False):
    result = {
        "id": str(row.id),
        "name": row.name,
        "category": row.category,
        "description": row.description,
        "active": row.active,
        "version": row.version,
        "workflow": row.workflow,
        "branch_ids": [str(x) for x in row.branches.values_list("id", flat=True)],
    }
    if prices:
        result.update(
            price=amount_text(row.price),
            payment_mode=row.payment_mode,
            deposit=amount_text(row.deposit),
            months=row.months,
        )
    return result


def case_data(row, member):
    from medframe_apps.billing.models import ServiceCaseInvoice

    agreement = ServiceCaseInvoice.objects.filter(case=row).select_related("invoice").first()
    result = {
        "id": str(row.id),
        "patient_id": str(row.patient_id),
        "patient_name": row.patient.full_name,
        "reference": row.patient.reference,
        "branch_id": str(row.branch_id),
        "service_id": str(row.service_id),
        "service_version": row.service_version,
        "name": row.snapshot["name"],
        "category": row.snapshot["category"],
        "status": row.status,
        "version": row.version,
        "invoice_id": str(agreement.invoice_id) if agreement and financial(member) else None,
        "steps": [
            {"id": str(x.id), "label": x.label, "status": x.status, "position": x.position}
            for x in row.steps.order_by("position")
        ],
        "events": [
            {
                "id": str(x.id),
                "kind": x.kind,
                "status": x.status,
                "step_id": str(x.step_id) if x.step_id else None,
                "reason": x.reason,
                "actor": x.actor.display_name,
                "created_at": x.created_at.isoformat(),
            }
            for x in row.events.select_related("actor").order_by("created_at", "id")
        ],
    }
    if financial(member):
        result["financial"] = {
            key: row.snapshot[key] for key in ["price", "payment_mode", "deposit", "months"]
        }
    return result
