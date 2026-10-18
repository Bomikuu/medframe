from datetime import timedelta
from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.common import check_version
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.operations.events import event
from medframe_apps.operations.inputs import BookingInput, RescheduleInput, parse
from medframe_apps.operations.models import Appointment, Reservation
from medframe_apps.operations.policy import (
    operational_patient,
    require_operations,
    require_provider_scope,
)
from medframe_apps.operations.reservations import claim_reservation
from medframe_apps.operations.scheduling import resolve_local, resource_for, scope
from medframe_apps.portal.policy import require_portal_link
from medframe_apps.record_filters import page_records


def appointment_scope(request, identifier, *, lock=False):
    query = Appointment.objects.select_related(
        "branch__organization", "provider__membership", "patient", "resource"
    )
    if lock:
        query = query.select_for_update(of=("self",))
    row = query.filter(id=identifier).first()
    if row is None:
        raise DomainError("NOT_FOUND", "This appointment is unavailable.", 404)
    member = require_operations(request, row.organization_id, "appointments.manage", row.branch_id)
    require_provider_scope(member, row.provider_id)
    return row


def summary(row):
    return {
        "status": row.status,
        "start": row.start.isoformat(),
        "end": row.end.isoformat(),
        "version": row.version,
    }


@transaction.atomic
def book_appointment(request, organization_id, data, request_id):
    data = parse(BookingInput, data)
    member, provider, branch = scope(
        request, organization_id, data.branch_id, data.provider_id, "appointments.manage"
    )
    patient = operational_patient(member, data.patient_id, branch.id)
    resource = resource_for(branch, data.resource_id)
    values = data.model_dump(mode="json")
    previous = replay_request(request.user, organization_id, "operations.book", request_id, values)
    if previous:
        return Appointment.objects.get(id=previous)
    start = resolve_local(data.start, ZoneInfo(branch.organization.timezone))
    if start < timezone.now():
        raise DomainError("INVALID_INPUT", "Choose a future appointment time.")
    if data.follow_up_id:
        from medframe_apps.treatments.models import FollowUp

        if not FollowUp.objects.filter(id=data.follow_up_id, patient=patient).exists():
            raise DomainError("NOT_FOUND", "This follow-up is unavailable.", 404)
    row = Appointment.objects.create(
        organization_id=organization_id,
        branch=branch,
        patient=patient,
        provider=provider,
        resource=resource,
        start=start,
        end=start + timedelta(minutes=data.duration),
        type=data.type,
        follow_up_id=data.follow_up_id,
        reason=data.reason,
        created_by=request.user,
    )
    claim_reservation(row, provider, patient, resource, row.start, row.end)
    event(request, branch, row, "appointment.booked", after=summary(row))
    record_request_result(
        request.user, organization_id, "operations.book", request_id, values, row.id
    )
    return row


def reschedule_locked(request, row, data, request_id):
    values = {"appointment": str(row.id), **data.model_dump(mode="json")}
    previous = replay_request(
        request.user, row.organization_id, "operations.reschedule", request_id, values
    )
    if previous:
        return Appointment.objects.get(id=previous)
    check_version(row.version, data.expected_version)
    if row.status != "booked":
        raise DomainError("CONFLICT", "Only a booked appointment can be rescheduled.", 409)
    start = resolve_local(data.start, ZoneInfo(row.branch.organization.timezone))
    if start < timezone.now():
        raise DomainError("INVALID_INPUT", "Choose a future appointment time.")
    before = summary(row)
    claim_reservation(
        row,
        row.provider,
        row.patient,
        row.resource,
        start,
        start + timedelta(minutes=data.duration),
    )
    row.start, row.end = start, start + timedelta(minutes=data.duration)
    row.version += 1
    row.save()
    event(request, row.branch, row, "appointment.rescheduled", before, summary(row), data.reason)
    record_request_result(
        request.user, row.organization_id, "operations.reschedule", request_id, values, row.id
    )
    return row


@transaction.atomic
def reschedule_appointment(request, appointment_id, data, request_id):
    return reschedule_locked(
        request,
        appointment_scope(request, appointment_id, lock=True),
        parse(RescheduleInput, data),
        request_id,
    )


def transition_locked(request, row, expected_version, target, reason, request_id):
    if (
        target not in {"cancelled", "no_show", "keep"}
        or not isinstance(reason, str)
        or len(reason) > 240
    ):
        raise DomainError(
            "INVALID_INPUT", "Choose a supported appointment action and short reason."
        )
    values = {
        "appointment": str(row.id),
        "version": expected_version,
        "target": target,
        "reason": reason,
    }
    previous = replay_request(
        request.user, row.organization_id, "operations.appointment-action", request_id, values
    )
    if previous:
        return Appointment.objects.get(id=previous)
    check_version(row.version, expected_version)
    if row.status not in {"booked", "checked_in"} or (
        target in {"keep", "no_show"} and row.status != "booked"
    ):
        raise DomainError("CONFLICT", "This appointment cannot take that action now.", 409)
    if target == "no_show" and timezone.now() < row.start:
        raise DomainError(
            "INVALID_INPUT", "Wait until the appointment has started before marking no-show."
        )
    before = summary(row)
    if target != "keep":
        row.status = target
        Reservation.objects.filter(appointment=row).update(active=False)
        from medframe_apps.operations.models import QueueTicket

        ticket = QueueTicket.objects.select_for_update().filter(appointment=row).first()
        if ticket:
            ticket.status = "cancelled"
            ticket.version += 1
            ticket.save()
    row.version += 1
    row.save()
    event(request, row.branch, row, f"appointment.{target}", before, summary(row), reason)
    record_request_result(
        request.user,
        row.organization_id,
        "operations.appointment-action",
        request_id,
        values,
        row.id,
    )
    return row


@transaction.atomic
def transition_appointment(request, appointment_id, expected_version, target, reason, request_id):
    return transition_locked(
        request,
        appointment_scope(request, appointment_id, lock=True),
        expected_version,
        target,
        reason,
        request_id,
    )


@transaction.atomic
def patient_appointment_action(request, link_id, appointment_id, data, request_id):
    link = require_portal_link(request, link_id, lock=True)
    row = (
        Appointment.objects.select_for_update(of=("self",))
        .select_related("branch__organization", "provider__membership", "patient", "resource")
        .filter(id=appointment_id, patient=link.patient, organization=link.organization)
        .first()
    )
    if row is None:
        raise DomainError("NOT_FOUND", "This appointment is unavailable.", 404)
    if row.status != "booked" or row.start <= timezone.now():
        raise DomainError(
            "CONFLICT", "Contact your clinic to change a checked-in or past appointment.", 409
        )
    action = data.get("action")
    if action == "reschedule":
        minutes = int((row.end - row.start).total_seconds() // 60)
        parsed = parse(
            RescheduleInput,
            {
                "start": data.get("start"),
                "duration": minutes,
                "expected_version": data.get("expected_version"),
                "reason": data.get("reason", "Patient requested reschedule"),
            },
        )
        return reschedule_locked(request, row, parsed, request_id)
    if action not in {"keep", "cancelled"}:
        raise DomainError("INVALID_INPUT", "Choose keep, reschedule or cancel.")
    return transition_locked(
        request, row, data.get("expected_version"), action, "Patient portal action", request_id
    )


def appointment_page(request, organization_id, filters, after=None):
    from medframe_apps.operations.serializers import appointment_details
    from medframe_apps.organizations.models import Branch

    branch = Branch.objects.filter(
        id=filters.get("branch_id"), organization_id=organization_id
    ).first()
    if branch is None:
        raise DomainError("NOT_FOUND", "Choose a permitted branch.", 404)
    member = require_operations(request, organization_id, "operations.read", branch.id)
    query = Appointment.objects.filter(branch=branch).select_related(
        "patient", "provider__membership__user", "resource"
    )
    from medframe_apps.organizations.policy import permissions_for

    if (
        "schedules.manage" not in permissions_for(member)
        and not member.roles.filter(name="receptionist").exists()
    ):
        query = query.filter(provider__membership__user=request.user)
    if filters.get("provider_id"):
        require_provider_scope(member, filters["provider_id"])
        query = query.filter(provider_id=filters["provider_id"])
    if filters.get("status"):
        query = query.filter(status=filters["status"])
    if filters.get("date"):
        from datetime import date, datetime, time

        day = date.fromisoformat(filters["date"])
        zone = ZoneInfo(branch.organization.timezone)
        query = query.filter(
            start__gte=datetime.combine(day, time.min, zone),
            start__lt=datetime.combine(day + timedelta(days=1), time.min, zone),
        )
    return page_records(
        query,
        scope=f"operations-appointments:{member.id}",
        filters=filters,
        after=after,
        first=50,
        serialize=appointment_details,
    )
