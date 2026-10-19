"""Read-only clinician gallery. Filter patient/provider/branch scope before serialization."""

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Q
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.encounters.models import Encounter
from medframe_apps.operations.models import Appointment, OperationsEvent, QueueTicket
from medframe_apps.organizations.models import Branch
from medframe_apps.organizations.policy import permissions_for, require_membership
from medframe_apps.patients.services import scoped_patients
from medframe_apps.stations.portraits import portrait_map


def minutes_after(actual, scheduled):
    return max(0, int((actual - scheduled).total_seconds() // 60)) if actual and scheduled else 0


def timing(appointment, ticket, now):
    value = {"kind": "on_time", "minutes": 0, "delay": ticket.delay if ticket else 0}
    if not appointment or appointment.status in {"cancelled", "no_show"}:
        value["kind"] = "unscheduled" if not appointment else appointment.status
    elif ticket and ticket.service_start:
        value.update(
            kind="started_late", minutes=minutes_after(ticket.service_start, appointment.start)
        )
    elif ticket:
        value.update(
            kind="late_arrival", minutes=minutes_after(ticket.created_at, appointment.start)
        )
    elif appointment.status == "booked" and now > appointment.start:
        value.update(kind="awaiting_arrival", minutes=minutes_after(now, appointment.start))
    return value


def card(patient, *, encounter=None, appointment=None, ticket=None, now, rescheduled=None):
    scheduled = appointment.start if appointment else None
    moment = scheduled or (encounter.created_at if encounter else ticket.created_at)
    key = encounter.id if encounter else ticket.id if ticket else appointment.id
    return {
        "id": str(key),
        "patient_id": str(patient.id),
        "patient": patient.full_name,
        "reference": patient.reference,
        "encounter_id": str(encounter.id) if encounter else None,
        "appointment_id": str(appointment.id) if appointment else None,
        "ticket_id": str(ticket.id) if ticket else None,
        "queue_number": ticket.number if ticket else None,
        "queue_day": ticket.day.date.isoformat() if ticket else None,
        "resource": ticket.resource.name
        if ticket and ticket.resource
        else (appointment.resource.name if appointment and appointment.resource else None),
        "time": moment.isoformat(),
        "time_kind": "scheduled" if scheduled else "opened" if encounter else "checked_in",
        "reason": encounter.reason
        if encounter
        else appointment.reason
        if appointment
        else "Walk-in consultation",
        "status": ticket.status
        if ticket
        else appointment.status
        if appointment
        else encounter.status,
        "clinical_status": encounter.status if encounter else None,
        "timing": timing(appointment, ticket, now),
        "rescheduled_at": rescheduled.created_at.isoformat() if rescheduled else None,
        "rescheduled_from": rescheduled.before.get("start") if rescheduled else None,
    }


def snapshot(request, organization_id, branch_id, *, view="today", before=None):
    member = require_membership(request.user, organization_id, "patients.clinical.read")
    branch = (
        Branch.objects.filter(id=branch_id, organization_id=organization_id)
        .select_related("organization")
        .first()
    )
    credential = getattr(request, "station_credential", None)
    if (
        not branch
        or (member.branch_id and member.branch_id != branch.id)
        or (credential and credential.device.branch_id != branch.id)
    ):
        raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
    allowed = scoped_patients(request.user, organization_id, "patients.clinical.read").filter(
        branch=branch
    )
    now = timezone.now()
    zone = ZoneInfo(branch.organization.timezone)
    today = now.astimezone(zone).date()
    start = datetime.combine(today, time.min, zone)
    finish = datetime.combine(today + timedelta(days=1), time.min, zone)
    encounters = Encounter.objects.filter(
        organization_id=organization_id, branch=branch, patient_id__in=allowed.values("id")
    ).select_related("patient")
    operations_available = "operations.read" in permissions_for(member)
    # A Station metadata feed never grants schedule or queue mutations.
    appointments, tickets = [], []
    if operations_available:
        require_membership(request.user, organization_id, "operations.read")
        appointments = list(
            Appointment.objects.filter(
                branch=branch,
                patient_id__in=allowed.values("id"),
                provider__membership__user=request.user,
                start__gte=start,
                start__lt=finish + timedelta(days=7),
            )
            .select_related("patient", "resource")
            .order_by("start", "id")[:101]
        )
        tickets = list(
            QueueTicket.objects.filter(
                day__branch=branch,
                patient_id__in=allowed.values("id"),
                provider__membership__user=request.user,
            )
            .filter(Q(day__date=today) | Q(status__in=["waiting", "called", "in_service"]))
            .select_related("day", "patient", "resource", "appointment__resource", "encounter")
            .order_by("order", "created_at", "id")[:101]
        )
    events = {}
    for event in OperationsEvent.objects.filter(
        branch=branch,
        object_id__in=[row.id for row in appointments],
        kind="appointment.rescheduled",
    ).order_by("-created_at", "-id"):
        events.setdefault(event.object_id, event)
    by_encounter = {row.encounter_id: row for row in tickets if row.encounter_id}
    by_appointment = {row.appointment_id: row for row in tickets if row.appointment_id}
    agenda = []
    for appointment in appointments:
        ticket = by_appointment.get(appointment.id)
        if appointment.status in {"cancelled", "no_show"} or (
            ticket and ticket.status in {"completed", "cancelled", "no_show"}
        ):
            continue
        agenda.append(
            card(
                appointment.patient,
                appointment=appointment,
                ticket=ticket,
                encounter=ticket.encounter if ticket and ticket.encounter_id else None,
                now=now,
                rescheduled=events.get(appointment.id),
            )
        )
    for ticket in tickets:
        if ticket.appointment_id in {row.id for row in appointments} or ticket.status not in {
            "waiting",
            "called",
            "in_service",
        }:
            continue
        agenda.append(
            card(
                ticket.patient,
                ticket=ticket,
                appointment=ticket.appointment,
                encounter=ticket.encounter,
                now=now,
            )
        )
    queue_rank = {str(row.id): index for index, row in enumerate(tickets)}
    agenda.sort(
        key=lambda row: (
            0 if row["status"] == "in_service" else 1 if row["ticket_id"] in queue_rank else 2,
            queue_rank.get(row["ticket_id"], 0),
            row["time"],
            row["id"],
        )
    )
    if view == "all":
        if before:
            encounters = encounters.filter(id__lt=before)
        selected = list(encounters.order_by("-id")[:25])
        has_more = len(selected) > 24
        selected = selected[:24]
        items = [card(row.patient, encounter=row, now=now) for row in selected]
        cursor = str(selected[-1].id) if has_more else None
    else:
        selected = list(
            encounters.filter(
                Q(created_at__gte=start, created_at__lt=finish) | Q(id__in=by_encounter)
            )
            .filter(provider__membership__user=request.user)
            .order_by("created_at", "id")[:101]
        )
        items = []
        represented_tickets, represented_appointments = set(), set()
        for row in selected:
            ticket = by_encounter.get(row.id)
            appointment = ticket.appointment if ticket and ticket.appointment_id else None
            items.append(
                card(
                    row.patient,
                    encounter=row,
                    appointment=appointment,
                    ticket=ticket,
                    now=now,
                    rescheduled=events.get(appointment.id) if appointment else None,
                )
            )
            if ticket:
                represented_tickets.add(ticket.id)
            if appointment:
                represented_appointments.add(appointment.id)
        for appointment in appointments:
            if appointment.start >= finish or appointment.id in represented_appointments:
                continue
            ticket = by_appointment.get(appointment.id)
            items.append(
                card(
                    appointment.patient,
                    appointment=appointment,
                    ticket=ticket,
                    now=now,
                    rescheduled=events.get(appointment.id),
                )
            )
            if ticket:
                represented_tickets.add(ticket.id)
        for ticket in tickets:
            if ticket.id not in represented_tickets and ticket.day.date == today:
                items.append(
                    card(ticket.patient, ticket=ticket, encounter=ticket.encounter, now=now)
                )
        items.sort(key=lambda row: (row["time"], row["id"]))
        has_more, cursor = len(items) > 50, None
        items = items[:50]
    photos = portrait_map({row["patient_id"] for row in items + agenda})
    for row in items + agenda:
        row["portrait_id"] = photos.get(row["patient_id"])
    audit(request.user, "station.dashboard.read", organization_id, branch.id)
    return {
        "items": items,
        "agenda": agenda[:40],
        "date": today.isoformat(),
        "timezone": branch.organization.timezone,
        "branch": branch.name,
        "updated_at": now.isoformat(),
        "has_more": has_more,
        "cursor": cursor,
        "agenda_truncated": len(agenda) > 40 or len(appointments) > 100 or len(tickets) > 100,
        "operations_available": operations_available,
    }
