from datetime import date
from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.billing.invoices import invoice_action
from medframe_apps.billing.queries import billing_setup, invoice_detail, invoice_page, staff_invoice


@strawberry.type
class BillingQuery:
    @strawberry.field
    def financial_overview(
        self,
        info: Info,
        organization_id: UUID,
        branch_id: UUID,
        days: int = 30,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> JSON:
        from medframe_apps.billing.analytics import financial_overview

        return financial_overview(
            info.context, organization_id, branch_id, days, start_date=start_date, end_date=end_date
        )

    @strawberry.field
    def cashier_reconciliation(
        self, info: Info, organization_id: UUID, branch_id: UUID, day: date
    ) -> JSON:
        from medframe_apps.billing.reconciliation import day_reconciliation

        return day_reconciliation(info.context, organization_id, branch_id, day)

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
    def billing_history(
        self,
        info: Info,
        organization_id: UUID,
        invoice_id: UUID,
        kind: str,
        after: str | None = None,
    ) -> JSON:
        from medframe_apps.billing.history import staff_history

        return staff_history(info.context, organization_id, invoice_id, kind, after)

    @strawberry.field
    def billing_payment_confirmation(
        self,
        info: Info,
        organization_id: UUID,
        invoice_id: UUID,
        payment_id: UUID,
    ) -> JSON:
        from medframe_apps.billing.history import staff_confirmation

        return staff_confirmation(info.context, organization_id, invoice_id, payment_id)

    @strawberry.field
    def billing_payment_review(
        self,
        info: Info,
        organization_id: UUID,
        invoice_id: UUID,
        expected_version: int,
        amount: str,
    ) -> JSON:
        from medframe_apps.billing.history import payment_review

        return payment_review(info.context, organization_id, invoice_id, expected_version, amount)

    @strawberry.field
    def billing_preview(self, info: Info, organization_id: UUID, data: JSON) -> JSON:
        from medframe_apps.billing.preview import draft_preview

        return draft_preview(info.context, organization_id, data)


@strawberry.type
class BillingMutation:
    @strawberry.mutation
    def billing_action(
        self, info: Info, organization_id: UUID, action: str, data: JSON, request_id: UUID
    ) -> JSON:
        row = invoice_action(info.context, organization_id, action, data, request_id)
        return invoice_detail(row)
