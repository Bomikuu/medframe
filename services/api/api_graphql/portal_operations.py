from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from config.errors import DomainError
from medframe_apps.operations.appointments import patient_appointment_action
from medframe_apps.operations.serializers import patient_available_slots, patient_operations


@strawberry.type
class PortalOperationsQuery:
    @strawberry.field
    def my_appointments(self, info: Info, link_id: UUID) -> JSON:
        return patient_operations(info.context, link_id)

    @strawberry.field
    def my_queue(self, info: Info, link_id: UUID) -> JSON:
        value = patient_operations(info.context, link_id)
        return {key: item for key, item in value.items() if key != "appointments"}

    @strawberry.field
    def my_appointment_availability(self, info: Info, link_id: UUID, data: JSON) -> JSON:
        if not isinstance(data, dict):
            raise DomainError("INVALID_INPUT", "Choose your appointment and date.")
        return patient_available_slots(info.context, link_id, data)


@strawberry.type
class PortalOperationsMutation:
    @strawberry.mutation
    def my_appointment_action(
        self, info: Info, link_id: UUID, appointment_id: UUID, data: JSON, request_id: UUID
    ) -> JSON:
        if not isinstance(data, dict):
            raise DomainError("INVALID_INPUT", "Choose a supported appointment action.")
        row = patient_appointment_action(info.context, link_id, appointment_id, data, request_id)
        return {"id": str(row.id), "version": row.version}
