from datetime import timedelta
from zoneinfo import ZoneInfo

from django.db.models import Q
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.operations.estimates import EstimateInput, estimate_queue
from medframe_apps.operations.models import Appointment, BranchRevision, QueueTicket, Reservation
from medframe_apps.operations.policy import consultation_setup, require_operations
from medframe_apps.operations.scheduling import windows
from medframe_apps.portal.policy import require_portal_link


def appointment_details(row, *, portal=False):
    value = {
        "id": str(row.id),
        "provider_id": str(row.provider_id),
        "provider": row.provider.membership.user.display_name or row.provider.membership.user.email,
        "branch_id": str(row.branch_id),
        "branch": row.branch.name,
        "start": row.start.isoformat(),
        "end": row.end.isoformat(),
        "type": row.type,
        "status": row.status,
        "version": row.version,
        "resource_id": str(row.resource_id) if row.resource_id else None,
        "resource": row.resource.name if row.resource_id else None,
    }
    if not portal:
        value.update(
            {
                "patient_id": str(row.patient_id),
                "patient": row.patient.full_name,
                "reference": row.patient.reference,
                "reason": row.reason,
            }
        )
    return value


def ticket_details(row, estimate=None, *, portal=False):
    value = {
        "id": str(row.id),
        "number": row.number,
        "day": row.day.date.isoformat(),
        "status": row.status,
        "version": row.version,
        "delay": row.delay,
        "duration": row.duration,
        "provider": row.provider.membership.user.display_name or row.provider.membership.user.email,
        "provider_id": str(row.provider_id),
        "checked_in": row.created_at.isoformat(),
        "estimate": estimate,
        "encounter_id": str(row.encounter_id) if row.encounter_id else None,
    }
    if not portal:
        value.update(
            {
                "patient_id": str(row.patient_id),
                "patient": row.patient.full_name,
                "reference": row.patient.reference,
                "branch_id": str(row.day.branch_id),
            }
        )
    return value


def branch_tickets(branch):
    return (
        QueueTicket.objects.filter(
            day__branch=branch, status__in=["waiting", "called", "in_service"]
        )
        .select_related("day__branch", "patient", "provider__membership__user", "resource")
        .order_by("order", "created_at", "id")
    )


def estimates_for(branch, tickets, now):
    today = now.astimezone(ZoneInfo(branch.organization.timezone)).date()
    providers = {str(row.provider.membership.user_id): row.provider for row in tickets}
    schedule = {key: windows(provider, branch, today) for key, provider in providers.items()}
    booked_ids = [row.appointment_id for row in tickets if row.appointment_id]
    occupied = [
        {
            "provider": str(row.provider_user_id),
            "resource": str(row.resource_id) if row.resource_id else None,
            "start": row.period.lower,
            "end": row.period.upper,
        }
        for row in Reservation.objects.filter(active=True)
        .filter(
            Q(provider_user_id__in=providers)
            | Q(resource_id__in=[ticket.resource_id for ticket in tickets if ticket.resource_id])
        )
        .exclude(appointment_id__in=booked_ids)
    ]
    for ticket in tickets:
        if ticket.status == "in_service":
            occupied.append(
                {
                    "provider": str(ticket.provider.membership.user_id),
                    "resource": str(ticket.resource_id) if ticket.resource_id else None,
                    "start": ticket.service_start or now,
                    "end": max(
                        now + timedelta(minutes=5),
                        (ticket.service_start or now) + timedelta(minutes=ticket.duration),
                    )
                    + timedelta(minutes=ticket.delay),
                }
            )
    normalized = [
        {
            "id": str(row.id),
            "provider": str(row.provider.membership.user_id),
            "resource": str(row.resource_id) if row.resource_id else None,
            "duration": row.duration,
            "delay": row.delay,
            "status": row.status,
        }
        for row in tickets
    ]
    return estimate_queue(EstimateInput(normalized, schedule, occupied), now)


def queue_snapshot(request, organization_id, branch_id, provider_id=None, after=None):
    from medframe_apps.operations.policy import require_provider_scope
    from medframe_apps.organizations.models import Branch
    from medframe_apps.organizations.policy import permissions_for

    member = require_operations(request, organization_id, "operations.read", branch_id)
    branch = Branch.objects.select_related("organization").get(id=branch_id)
    query = branch_tickets(branch)
    if (
        "schedules.manage" not in permissions_for(member)
        and not member.roles.filter(name="receptionist").exists()
    ):
        query = query.filter(provider__membership__user=request.user)
    if provider_id:
        require_provider_scope(member, provider_id)
        query = query.filter(provider_id=provider_id)
    tickets = list(query)
    now = timezone.now()
    estimates = estimates_for(branch, tickets, now)
    revision = (
        BranchRevision.objects.filter(branch=branch).values_list("revision", flat=True).first() or 0
    )
    from django.core import signing

    binding = f"{member.id}:{branch_id}:{provider_id}:{revision}"
    offset = 0
    if after:
        try:
            cursor = signing.loads(after, salt="operations-queue:v1", max_age=3600)
            if cursor["binding"] != binding:
                raise ValueError()
            ids = [str(row.id) for row in tickets]
            offset = ids.index(cursor["last"]) + 1
        except (signing.BadSignature, KeyError, ValueError, TypeError):
            raise DomainError(
                "CONFLICT", "The queue changed. Return to the first page.", 409
            ) from None
    selected = tickets[offset : offset + 50]
    end_cursor = (
        signing.dumps(
            {"binding": binding, "last": str(selected[-1].id)}, salt="operations-queue:v1"
        )
        if selected and len(tickets) > offset + 50
        else None
    )
    items = []
    for row in selected:
        item = ticket_details(row, estimates.get(str(row.id)))
        item["setup_blockers"] = consultation_setup(
            request, organization_id, row.patient_id, row.provider_id, branch_id
        )
        items.append(item)
    return {
        "items": items,
        "waiting": sum(row.status in {"waiting", "called"} for row in tickets),
        "in_service": sum(row.status == "in_service" for row in tickets),
        "revision": revision,
        "updated_at": now.isoformat(),
        "truncated": len(tickets) > 50,
        "end_cursor": end_cursor,
        "has_next_page": end_cursor is not None,
        "timezone": branch.organization.timezone,
    }


def patient_operations(request, link_id, now=None):
    link = require_portal_link(request, link_id)
    branch = link.patient.branch
    now = now or timezone.now()
    tickets = list(branch_tickets(branch))
    estimates = estimates_for(branch, tickets, now)
    own = []
    for index, ticket in enumerate(tickets):
        if ticket.patient_id == link.patient_id:
            item = ticket_details(ticket, estimates.get(str(ticket.id)), portal=True)
            ahead = sum(
                other.provider_id == ticket.provider_id and other.status in {"waiting", "called"}
                for other in tickets[:index]
            )
            item.update({"position": ahead + 1, "ahead": ahead})
            own.append(item)
    appointments = (
        Appointment.objects.filter(organization=link.organization, patient=link.patient)
        .select_related("provider__membership__user", "branch", "resource")
        .order_by("-start")[:50]
    )
    return {
        "appointments": [appointment_details(row, portal=True) for row in appointments],
        "tickets": own,
        "branch": branch.name,
        "waiting": sum(row.status in {"waiting", "called"} for row in tickets),
        "in_service": sum(row.status == "in_service" for row in tickets),
        "updated_at": now.isoformat(),
        "revision": BranchRevision.objects.filter(branch=branch)
        .values_list("revision", flat=True)
        .first()
        or 0,
        "timezone": link.organization.timezone,
    }


def patient_available_slots(request, link_id, data):
    from medframe_apps.operations.inputs import AvailabilityInput, parse
    from medframe_apps.operations.scheduling import slots

    link = require_portal_link(request, link_id)
    row = (
        Appointment.objects.filter(
            id=data.get("appointment_id"),
            patient=link.patient,
            organization=link.organization,
            status="booked",
        )
        .select_related("provider__membership", "branch__organization")
        .first()
    )
    if row is None:
        raise DomainError("NOT_FOUND", "Choose your own booked appointment.", 404)
    parsed = parse(
        AvailabilityInput,
        {
            "branch_id": row.branch_id,
            "provider_id": row.provider_id,
            "resource_id": row.resource_id,
            "duration": int((row.end - row.start).total_seconds() // 60),
            "date_from": data.get("date"),
            "date_to": data.get("date"),
        },
    )
    return slots(row.provider, row.branch, parsed, row.id, link.patient)
