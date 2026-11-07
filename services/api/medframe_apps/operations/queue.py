from datetime import timedelta
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.operations.appointments import appointment_scope
from medframe_apps.operations.events import event
from medframe_apps.operations.inputs import QueueTransitionInput, WalkInInput, parse
from medframe_apps.operations.models import Appointment, QueueDay, QueueTicket, Reservation
from medframe_apps.operations.policy import (
    consultation_setup,
    operational_patient,
    require_operations,
    require_provider_scope,
)
from medframe_apps.operations.reservations import claim_reservation
from medframe_apps.operations.scheduling import resource_for, scope

ACTIVE = ("waiting", "called", "in_service")


def new_ticket(request, branch, patient, provider, resource, duration, appointment=None):
    advisory_lock(f"operations-queue-day:{branch.id}")
    day, _ = QueueDay.objects.get_or_create(
        branch=branch, date=timezone.now().astimezone(ZoneInfo(branch.organization.timezone)).date()
    )
    day = QueueDay.objects.select_for_update().get(id=day.id)
    number = day.next_number
    day.next_number += 1
    day.save()
    last_order = (
        QueueTicket.objects.filter(day__branch=branch, status__in=ACTIVE).aggregate(
            last=Max("order")
        )["last"]
        or 0
    )
    return QueueTicket.objects.create(
        day=day,
        patient=patient,
        provider=provider,
        resource=resource,
        appointment=appointment,
        number=number,
        order=last_order + 1024,
        duration=duration,
        created_by=request.user,
    )


@transaction.atomic
def check_in(request, appointment_id, expected_version, request_id):
    row = appointment_scope(request, appointment_id, lock=True)
    require_operations(request, row.organization_id, "queues.manage", row.branch_id)
    room = getattr(row, "online_room", None)
    if room and room.timing_mode == "instant":
        raise DomainError(
            "INVALID_INPUT",
            "Use the instant room's PIN and doctor admission instead of queue check-in.",
        )
    values = {"appointment": str(row.id), "version": expected_version}
    previous = replay_request(
        request.user, row.organization_id, "operations.check-in", request_id, values
    )
    if previous:
        return QueueTicket.objects.get(id=previous)
    ticket = QueueTicket.objects.filter(appointment=row).first()
    if ticket:
        return ticket
    check_version(row.version, expected_version)
    if row.status != "booked":
        raise DomainError("CONFLICT", "Only a booked appointment can be checked in.", 409)
    ticket = new_ticket(
        request,
        row.branch,
        row.patient,
        row.provider,
        row.resource,
        int((row.end - row.start).total_seconds() // 60),
        row,
    )
    row.status = "checked_in"
    row.version += 1
    row.save()
    event(request, row.branch, ticket, "queue.checked_in", after={"status": ticket.status})
    record_request_result(
        request.user, row.organization_id, "operations.check-in", request_id, values, ticket.id
    )
    return ticket


@transaction.atomic
def add_walk_in(request, organization_id, data, request_id):
    data = parse(WalkInInput, data)
    member, provider, branch = scope(
        request, organization_id, data.branch_id, data.provider_id, "queues.manage"
    )
    patient = operational_patient(member, data.patient_id, branch.id)
    values = data.model_dump(mode="json")
    previous = replay_request(
        request.user, organization_id, "operations.walk-in", request_id, values
    )
    if previous:
        return QueueTicket.objects.get(id=previous)
    ticket = new_ticket(
        request, branch, patient, provider, resource_for(branch, data.resource_id), data.duration
    )
    event(request, branch, ticket, "queue.walk_in", after={"status": ticket.status})
    record_request_result(
        request.user, organization_id, "operations.walk-in", request_id, values, ticket.id
    )
    return ticket


def ticket_scope(request, ticket_id):
    initial = QueueTicket.objects.filter(id=ticket_id).values("appointment_id").first()
    if initial is None:
        raise DomainError("NOT_FOUND", "This queue ticket is unavailable.", 404)
    if initial["appointment_id"]:
        Appointment.objects.select_for_update().get(id=initial["appointment_id"])
    row = (
        QueueTicket.objects.select_for_update(of=("self",))
        .select_related(
            "day__branch__organization",
            "provider__membership",
            "patient",
            "resource",
            "appointment",
        )
        .get(id=ticket_id)
    )
    branch = row.day.branch
    member = require_operations(request, branch.organization_id, "queues.manage", branch.id)
    require_provider_scope(member, row.provider_id)
    return row


@transaction.atomic
def transition_ticket(request, ticket_id, data, request_id):
    data = parse(QueueTransitionInput, data)
    from medframe_apps.stations.payment_policy import lock_visit_for_ticket, require_clearance

    lock_visit_for_ticket(ticket_id)
    row = ticket_scope(request, ticket_id)
    branch = row.day.branch
    values = {"ticket": str(row.id), **data.model_dump(mode="json")}
    previous = replay_request(
        request.user, branch.organization_id, "operations.queue-action", request_id, values
    )
    if previous:
        return QueueTicket.objects.get(id=previous)
    check_version(row.version, data.expected_version)
    before = {
        "status": row.status,
        "version": row.version,
        "duration": row.duration,
        "delay": row.delay,
    }
    allowed = {
        "waiting": {"called", "cancelled", "no_show", "delay"},
        "called": {"waiting", "in_service", "cancelled", "no_show", "delay", "recall"},
        "in_service": {"completed", "delay", "extend"},
    }
    if data.target not in allowed.get(row.status, set()):
        raise DomainError("CONFLICT", "This queue state changed. Refresh before continuing.", 409)
    if data.target in {"waiting", "cancelled", "no_show", "delay", "extend"} and not data.reason:
        raise DomainError("INVALID_INPUT", "Record a short operational reason.")
    advisory_lock(f"operations-provider:{row.provider.membership.user_id}")
    if data.target == "in_service":
        from medframe_apps.stations.models import VisitStage

        stage = (
            VisitStage.objects.select_related("department", "visit__branch__organization")
            .filter(queue_ticket=row)
            .first()
        )
        if stage:
            require_clearance(request, stage, data.payment_exception_reason)
        if (
            QueueTicket.objects.filter(
                service_user_id=row.provider.membership.user_id, status="in_service"
            )
            .exclude(id=row.id)
            .exists()
        ):
            raise DomainError(
                "CONFLICT", "This provider is already consulting. Complete that ticket first.", 409
            )
        now = timezone.now()
        owner = row.appointment if row.appointment_id else row
        claim_reservation(
            owner,
            row.provider,
            row.patient,
            row.resource,
            now,
            now + timedelta(minutes=row.duration),
        )
        row.service_start, row.service_user_id = now, row.provider.membership.user_id
    elif data.target == "extend":
        if not data.minutes or data.minutes % 5:
            raise DomainError("INVALID_INPUT", "Choose an extension in five-minute increments.")
        row.duration += data.minutes
        if row.duration > 240:
            raise DomainError("INVALID_INPUT", "Service duration is limited to 240 minutes.")
        owner = row.appointment if row.appointment_id else row
        claim_reservation(
            owner,
            row.provider,
            row.patient,
            row.resource,
            row.service_start,
            max(timezone.now(), row.service_start) + timedelta(minutes=data.minutes),
        )
    elif data.target == "delay":
        row.delay = data.minutes
    if data.target in {"completed", "cancelled", "no_show"}:
        identity = {"appointment": row.appointment} if row.appointment_id else {"ticket": row}
        Reservation.objects.filter(**identity).update(active=False)
    if data.target not in {"delay", "extend", "recall"}:
        row.status = data.target
    row.version += 1
    row.save()
    if row.appointment_id:
        mapped = {
            "in_service": "in_service",
            "completed": "completed",
            "cancelled": "cancelled",
            "no_show": "cancelled",
        }
        if data.target in mapped:
            row.appointment.status = mapped[data.target]
            row.appointment.version += 1
            row.appointment.save()
    event(
        request,
        branch,
        row,
        f"queue.{data.target}",
        before,
        {
            "status": row.status,
            "version": row.version,
            "duration": row.duration,
            "delay": row.delay,
        },
        data.reason,
    )
    record_request_result(
        request.user, branch.organization_id, "operations.queue-action", request_id, values, row.id
    )
    return row


@transaction.atomic
def move_ticket(request, ticket_id, before_id, expected_version, reason, request_id):
    row = ticket_scope(request, ticket_id)
    branch = row.day.branch
    advisory_lock(f"operations-queue-day:{branch.id}")
    values = {
        "ticket": str(row.id),
        "before": str(before_id),
        "version": expected_version,
        "reason": reason,
    }
    previous = replay_request(
        request.user, branch.organization_id, "operations.queue-move", request_id, values
    )
    if previous:
        return row
    check_version(row.version, expected_version)
    if row.status not in {"waiting", "called"} or not reason or len(reason) > 240:
        raise DomainError(
            "INVALID_INPUT", "Only waiting/called tickets can move, with a short reason."
        )
    tickets = list(
        QueueTicket.objects.select_for_update()
        .filter(day__branch=branch, provider=row.provider, status__in=["waiting", "called"])
        .exclude(id=row.id)
        .order_by("order", "id")
    )
    ids = [item.id for item in tickets]
    if before_id and before_id not in ids:
        raise DomainError("NOT_FOUND", "The target ticket is no longer in this queue.", 404)
    tickets.insert(ids.index(before_id) if before_id else len(tickets), row)
    for index, ticket in enumerate(tickets):
        ticket.order = (index + 1) * 1024
        ticket.version += 1
        ticket.save()
    event(request, branch, row, "queue.reordered", reason=reason)
    record_request_result(
        request.user, branch.organization_id, "operations.queue-move", request_id, values, row.id
    )
    return row


@transaction.atomic
def link_consultation(request, ticket_id, encounter_id, expected_version, request_id):
    from medframe_apps.encounters.models import Encounter

    row = ticket_scope(request, ticket_id)
    branch = row.day.branch
    values = {"ticket": str(row.id), "encounter": str(encounter_id), "version": expected_version}
    previous = replay_request(
        request.user, branch.organization_id, "operations.queue-link", request_id, values
    )
    if previous:
        return row
    check_version(row.version, expected_version)
    if consultation_setup(
        request, branch.organization_id, row.patient_id, row.provider_id, branch.id
    ):
        raise DomainError(
            "FORBIDDEN",
            "Complete your provider, branch and patient-access setup before linking care.",
            403,
        )
    encounter = Encounter.objects.filter(
        id=encounter_id,
        organization_id=branch.organization_id,
        branch=branch,
        patient=row.patient,
        provider=row.provider,
    ).first()
    if encounter is None:
        raise DomainError(
            "NOT_FOUND",
            "Choose this patient's consultation with the same provider and branch.",
            404,
        )
    row.encounter = encounter
    row.version += 1
    row.save()
    event(request, branch, row, "queue.consultation_linked")
    record_request_result(
        request.user, branch.organization_id, "operations.queue-link", request_id, values, row.id
    )
    return row
