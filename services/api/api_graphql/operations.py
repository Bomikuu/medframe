from uuid import UUID

import strawberry
from django.db.models import Q
from strawberry.scalars import JSON
from strawberry.types import Info

from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.operations import appointments, queue, scheduling
from medframe_apps.operations.models import BranchResource, ProviderSchedule, ScheduleOverride
from medframe_apps.operations.policy import require_operations
from medframe_apps.operations.serializers import queue_snapshot
from medframe_apps.organizations.models import Branch
from medframe_apps.organizations.policy import permissions_for, require_membership
from medframe_apps.patients.models import Patient
from medframe_apps.providers.models import ProviderProfile


def setup(request, organization_id, branch_id=None, search=""):
    require_session_realm(request, "staff")
    member = require_membership(request.user, organization_id, "operations.read")
    branches = Branch.objects.filter(organization_id=organization_id)
    if member.branch_id:
        branches = branches.filter(id=member.branch_id)
    branch = branches.filter(id=branch_id).first() if branch_id else branches.first()
    if branch is None:
        raise DomainError("NOT_FOUND", "No permitted branch is available.", 404)
    require_operations(request, organization_id, "operations.read", branch.id)
    profiles = (
        ProviderProfile.objects.select_related("membership__user")
        .filter(
            membership__organization_id=organization_id,
            membership__active=True,
            membership__user__is_active=True,
        )
        .filter(Q(membership__branch=branch) | Q(membership__branch__isnull=True))
    )
    if (
        "schedules.manage" not in permissions_for(member)
        and not member.roles.filter(name="receptionist").exists()
    ):
        profiles = profiles.filter(membership__user=request.user)
    patients = Patient.objects.filter(organization_id=organization_id, branch=branch)
    if search:
        patients = patients.filter(
            Q(full_name__icontains=str(search)[:160]) | Q(reference__icontains=str(search)[:160])
        )
    return {
        "branches": [{"id": str(row.id), "name": row.name} for row in branches],
        "branch_id": str(branch.id),
        "timezone": member.organization.timezone,
        "providers": [
            {
                "id": str(row.id),
                "name": row.membership.user.display_name or row.membership.user.email,
            }
            for row in profiles
        ],
        "patients": [
            {"id": str(row.id), "name": row.full_name, "reference": row.reference}
            for row in patients.order_by("full_name")[:50]
        ],
        "resources": [
            {"id": str(row.id), "name": row.name, "active": row.active, "version": row.version}
            for row in BranchResource.objects.filter(branch=branch)
        ],
        "schedules": [
            {
                "id": str(row.id),
                "provider_id": str(row.provider_id),
                "weekday": row.weekday,
                "effective_from": row.effective_from.isoformat(),
                "effective_to": row.effective_to.isoformat(),
                "opens": row.opens.isoformat(),
                "closes": row.closes.isoformat(),
                "duration": row.duration,
                "active": row.active,
                "version": row.version,
            }
            for row in ProviderSchedule.objects.filter(branch=branch, provider__in=profiles)
        ],
        "overrides": [
            {
                "id": str(row.id),
                "provider_id": str(row.provider_id) if row.provider_id else None,
                "date": row.date.isoformat(),
                "closed": row.closed,
                "opens": row.opens.isoformat() if row.opens else None,
                "closes": row.closes.isoformat() if row.closes else None,
                "version": row.version,
            }
            for row in ScheduleOverride.objects.filter(branch=branch).filter(
                Q(provider__in=profiles) | Q(provider__isnull=True)
            )
        ],
        "permissions": sorted(permissions_for(member)),
    }


@strawberry.type
class OperationsQuery:
    @strawberry.field
    def operations_setup(
        self, info: Info, organization_id: UUID, branch_id: UUID | None = None, search: str = ""
    ) -> JSON:
        return setup(info.context, organization_id, branch_id, search)

    @strawberry.field
    def appointment_availability(self, info: Info, organization_id: UUID, data: JSON) -> JSON:
        return scheduling.available_slots(info.context, organization_id, data)

    @strawberry.field
    def appointments(
        self, info: Info, organization_id: UUID, filters: JSON, after: str | None = None
    ) -> JSON:
        return appointments.appointment_page(info.context, organization_id, filters, after)

    @strawberry.field
    def branch_queue(
        self,
        info: Info,
        organization_id: UUID,
        branch_id: UUID,
        provider_id: UUID | None = None,
        after: str | None = None,
    ) -> JSON:
        return queue_snapshot(info.context, organization_id, branch_id, provider_id, after)


@strawberry.type
class OperationsMutation:
    @strawberry.mutation
    def operations_action(
        self, info: Info, organization_id: UUID, action: str, data: JSON, request_id: UUID
    ) -> JSON:
        require_session_realm(info.context, "staff")
        if not isinstance(data, dict):
            raise DomainError("INVALID_INPUT", "Use named operation fields.")
        request = info.context
        if action == "schedule":
            row = scheduling.save_schedule(request, organization_id, data, request_id)
        elif action == "resource":
            row = scheduling.save_resource(request, organization_id, data, request_id)
        elif action == "override":
            row = scheduling.save_override(request, organization_id, data, request_id)
        elif action == "book":
            row = appointments.book_appointment(request, organization_id, data, request_id)
        elif action == "walk_in":
            row = queue.add_walk_in(request, organization_id, data, request_id)
        else:
            try:
                identifier = UUID(data.get("id", ""))
            except (ValueError, TypeError):
                raise DomainError(
                    "INVALID_INPUT", "Choose an existing appointment or ticket."
                ) from None
            if action in {"reschedule", "appointment_action", "check_in"}:
                from medframe_apps.operations.models import Appointment

                if not Appointment.objects.filter(
                    id=identifier, organization_id=organization_id
                ).exists():
                    raise DomainError("NOT_FOUND", "This appointment is unavailable.", 404)
            else:
                from medframe_apps.operations.models import QueueTicket

                if not QueueTicket.objects.filter(
                    id=identifier, day__branch__organization_id=organization_id
                ).exists():
                    raise DomainError("NOT_FOUND", "This queue ticket is unavailable.", 404)
            payload = {key: value for key, value in data.items() if key != "id"}
            if action == "reschedule":
                row = appointments.reschedule_appointment(request, identifier, payload, request_id)
            elif action == "appointment_action":
                row = appointments.transition_appointment(
                    request,
                    identifier,
                    data.get("expected_version"),
                    data.get("target"),
                    data.get("reason", ""),
                    request_id,
                )
            elif action == "check_in":
                row = queue.check_in(request, identifier, data.get("expected_version"), request_id)
            elif action == "queue_action":
                row = queue.transition_ticket(request, identifier, payload, request_id)
            elif action == "move":
                row = queue.move_ticket(
                    request,
                    identifier,
                    UUID(data["before_id"]) if data.get("before_id") else None,
                    data.get("expected_version"),
                    data.get("reason", ""),
                    request_id,
                )
            elif action == "link":
                row = queue.link_consultation(
                    request,
                    identifier,
                    UUID(data.get("encounter_id", "")),
                    data.get("expected_version"),
                    request_id,
                )
            else:
                raise DomainError("INVALID_INPUT", "Choose a supported operation.")
        return {"id": str(row.id), "version": getattr(row, "version", 1)}
