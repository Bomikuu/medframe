from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.billing.calculations import amount_text, draft_totals
from medframe_apps.billing.inputs import DraftInput
from medframe_apps.billing.invoices import invoice_action, validate_input
from medframe_apps.billing.policy import financial_patient, staff_member
from medframe_apps.billing.queries import billing_setup, invoice_detail, invoice_page, staff_invoice


@strawberry.type
class BillingQuery:
    @strawberry.field
    def financial_overview(
        self, info: Info, organization_id: UUID, branch_id: UUID, days: int = 30
    ) -> JSON:
        from medframe_apps.billing.analytics import financial_overview

        return financial_overview(info.context, organization_id, branch_id, days)

    @strawberry.field
    def billing_setup(
        self, info: Info, organization_id: UUID, branch_id: UUID | None = None, search: str = ""
    ) -> JSON:
        return billing_setup(info.context, organization_id, branch_id, search)

    @strawberry.field
    def billing_invoices(
        self,
        info: Info,
        organization_id: UUID,
        branch_id: UUID,
        filters: JSON | None = None,
        after: str | None = None,
        patient_id: UUID | None = None,
    ) -> JSON:
        return invoice_page(info.context, organization_id, branch_id, filters, after, patient_id)

    @strawberry.field
    def billing_invoice(self, info: Info, organization_id: UUID, invoice_id: UUID) -> JSON:
        return staff_invoice(info.context, organization_id, invoice_id)

    @strawberry.field
    def billing_preview(self, info: Info, organization_id: UUID, data: JSON) -> JSON:
        member = staff_member(info.context, organization_id, "billing.manage")
        parsed = validate_input(DraftInput, data)
        financial_patient(member, parsed.branch_id, parsed.patient_id)
        return {
            key: amount_text(value)
            for key, value in draft_totals(
                parsed.lines, parsed.discount_kind, parsed.discount_value
            ).items()
        }


@strawberry.type
class BillingMutation:
    @strawberry.mutation
    def billing_action(
        self, info: Info, organization_id: UUID, action: str, data: JSON, request_id: UUID
    ) -> JSON:
        row = invoice_action(info.context, organization_id, action, data, request_id)
        return invoice_detail(row)
