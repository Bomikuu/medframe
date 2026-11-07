"""Read-only draft arithmetic; no case, invoice or obligation is created."""

from uuid import UUID

from medframe_apps.billing.calculations import amount_text, draft_totals, money
from medframe_apps.billing.inputs import DraftInput
from medframe_apps.billing.installment_inputs import InstallmentInput
from medframe_apps.billing.installment_schedule import build_schedule
from medframe_apps.billing.invoices import validate_input
from medframe_apps.billing.policy import financial_patient, staff_member


class PreviewInstallmentInput(InstallmentInput):
    # A new service case is created only on Save, never to calculate a preview.
    case_id: UUID | None = None


class PreviewInput(DraftInput):
    installment: PreviewInstallmentInput | None = None


def draft_preview(request, organization_id, data):
    member = staff_member(request, organization_id, "billing.manage")
    parsed = validate_input(PreviewInput, data)
    financial_patient(member, parsed.branch_id, parsed.patient_id)
    totals = draft_totals(parsed.lines, parsed.discount_kind, parsed.discount_value)
    result = {key: amount_text(value) for key, value in totals.items()}
    result["installment"] = None
    if parsed.installment:
        plan = parsed.installment
        deposit = money(plan.deposit)
        rows = build_schedule(
            totals["total"], deposit, plan.months, plan.first_due, plan.deposit_due
        )
        monthly = [row for row in rows if row.kind == "monthly"]
        result["installment"] = {
            "deposit": amount_text(deposit),
            "financed": amount_text(totals["total"] - deposit),
            "months": plan.months,
            "regular": amount_text(monthly[0].amount),
            "final": amount_text(monthly[-1].amount),
            "first_due": monthly[0].due_date.isoformat(),
            "last_due": monthly[-1].due_date.isoformat(),
            "rows": [
                {
                    "kind": row.kind,
                    "due_date": row.due_date.isoformat(),
                    "amount": amount_text(row.amount),
                }
                for row in rows
            ],
        }
    return result
