"""Today visit representations: ticket, then unlinked booking, then unlinked encounter."""

from django.db.models import Count

from medframe_apps.encounters.models import Encounter
from medframe_apps.operations.models import Appointment, QueueTicket
from medframe_apps.operations.portraits import attach_portraits


def status_group(status):
    if status in {"waiting", "called", "checked_in"}:
        return "waiting"
    if status in {"in_service", "in_progress"}:
        return "in_service"
    if status in {"completed", "finalized"}:
        return "completed"
    return "scheduled"


def visit_queries(request, member, branch, day, bounds, codes, clinical_patients):
    start, end = bounds
    tickets = QueueTicket.objects.none()
    appointments = Appointment.objects.none()
    if "operations.read" in codes:
        tickets = QueueTicket.objects.filter(day__branch=branch, day__date=day)
        appointments = Appointment.objects.filter(branch=branch, start__gte=start, start__lt=end)
        if (
            "schedules.manage" not in codes
            and not member.roles.filter(name="receptionist").exists()
        ):
            tickets = tickets.filter(provider__membership__user=request.user)
            appointments = appointments.filter(provider__membership__user=request.user)
        appointments = appointments.exclude(
            id__in=tickets.filter(appointment_id__isnull=False).values("appointment_id")
        )
    encounters = Encounter.objects.filter(
        organization=member.organization,
        branch=branch,
        patient_id__in=clinical_patients.values("id"),
        created_at__gte=start,
        created_at__lt=end,
    )
    if "organization.manage" not in codes:
        encounters = encounters.filter(provider__membership__user=request.user)
    encounters = encounters.exclude(
        id__in=tickets.filter(encounter_id__isnull=False).values("encounter_id")
    )
    return [
        ("queue", tickets, "created_at"),
        ("appointment", appointments, "start"),
        ("encounter", encounters, "created_at"),
    ]


def visits(request, organization_id, queries, selected, page):
    totals = {key: 0 for key in ["all", "waiting", "in_service", "completed", "scheduled"]}
    states = {key: set() for key in totals}
    for _, query, _ in queries:
        for item in query.values("status").annotate(count=Count("id")):
            group = status_group(item["status"])
            totals[group] += item["count"]
            totals["all"] += item["count"]
            states[group].add(item["status"])
    # Take enough rows from each source for the requested merged page, never just count the preview.
    stop = page * 8
    rows = []
    for kind, query, field in queries:
        if selected != "all":
            query = query.filter(status__in=states[selected])
        query = query.select_related("patient", "provider__membership__user")
        if kind == "queue":
            query = query.select_related("day", "appointment")
        for item in query.order_by(field, "id")[:stop]:
            encounter_id = (
                str(item.encounter_id)
                if kind == "queue" and item.encounter_id
                else str(item.id)
                if kind == "encounter"
                else None
            )
            at = item.start if kind == "appointment" else item.created_at
            rows.append(
                {
                    "id": str(item.id),
                    "kind": kind,
                    "at": at.isoformat(),
                    "patient_id": str(item.patient_id),
                    "patient": item.patient.full_name,
                    "reference": item.patient.reference,
                    "provider_id": str(item.provider_id),
                    "provider": item.provider.membership.user.display_name,
                    "status": item.status,
                    "group": status_group(item.status),
                    "visit_type": "Walk-in"
                    if kind == "queue" and not item.appointment_id
                    else "Appointment"
                    if kind in {"appointment", "queue"}
                    else "Consultation",
                    "encounter_id": encounter_id,
                    "appointment_id": str(item.id)
                    if kind == "appointment"
                    else str(item.appointment_id)
                    if kind == "queue" and item.appointment_id
                    else None,
                    "waiting_since": item.created_at.isoformat()
                    if kind == "queue" and item.status in {"waiting", "called"}
                    else None,
                }
            )
    rows.sort(key=lambda row: (row["at"], row["kind"], row["id"]))
    return attach_portraits(
        request,
        organization_id,
        {"totals": totals, "items": rows[stop - 8 : stop], "total": totals[selected], "page": page},
    )
