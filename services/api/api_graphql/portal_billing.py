from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.billing.queries import portal_invoices
from medframe_apps.communications.preferences import portal_preference, revoke_preference


@strawberry.type
class PortalBillingQuery:
    @strawberry.field
    def my_notifications(self, info: Info, link_id: UUID, after: str | None = None) -> JSON:
        from medframe_apps.auditing.notifications import patient_notifications

        return patient_notifications(info.context, link_id, after)

    @strawberry.field
    def my_billing(self, info: Info, link_id: UUID, after: str | None = None) -> JSON:
        return portal_invoices(info.context, link_id, after)

    @strawberry.field
    def my_invoice(self, info: Info, link_id: UUID, invoice_id: UUID) -> JSON:
        return portal_invoices(info.context, link_id, invoice_id=invoice_id)

    @strawberry.field
    def my_communication_preferences(self, info: Info, link_id: UUID) -> JSON:
        return portal_preference(info.context, link_id)


@strawberry.type
class PortalBillingMutation:
    @strawberry.mutation
    def read_my_notifications(self, info: Info, link_id: UUID, ids: list[UUID]) -> bool:
        from medframe_apps.auditing.notifications import read_patient_notifications

        return read_patient_notifications(info.context, link_id, ids)

    @strawberry.mutation
    def revoke_my_reminders(self, info: Info, link_id: UUID, expected_version: int) -> JSON:
        return revoke_preference(info.context, link_id, expected_version)
