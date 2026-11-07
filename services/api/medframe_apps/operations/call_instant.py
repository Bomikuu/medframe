"""Create an immediate patient-bound room without a scheduled-slot reservation."""

from datetime import timedelta
from uuid import UUID

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from pydantic import Field

from config.errors import DomainError
from medframe_apps.common import advisory_lock
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.operations.call_models import AppointmentRoom
from medframe_apps.operations.call_policy import doctor_for, live_room, native_request
from medframe_apps.operations.call_service import create_room
from medframe_apps.operations.events import event
from medframe_apps.operations.inputs import Input, parse
from medframe_apps.operations.models import Appointment
from medframe_apps.operations.policy import operational_patient
from medframe_apps.operations.scheduling import scope


class InstantRoomInput(Input):
    organization_id: UUID
    branch_id: UUID
    provider_id: UUID
    patient_id: UUID
    request_id: UUID
    reason: str = Field(default="", max_length=240)


@transaction.atomic
def create_instant(request, values):
    data = parse(InstantRoomInput, values)
    native_request(request.session.session_key)
    member, provider, branch = scope(
        request, data.organization_id, data.branch_id, data.provider_id, "appointments.manage"
    )
    patient = operational_patient(member, data.patient_id, branch.id)
    # Verify clinical ownership before looking up another room or writing a visit.
    bound = AppointmentRoom(
        appointment=Appointment(
            organization_id=data.organization_id, branch=branch, patient=patient, provider=provider
        ),
        doctor_mode="assigned",
    )
    doctor_for(request, bound)
    payload = data.model_dump(mode="json", exclude={"request_id"})
    previous = replay_request(
        request.user, data.organization_id, "calls.instant", data.request_id, payload
    )
    if previous:
        row = AppointmentRoom.objects.select_related(
            "appointment__branch__organization",
            "appointment__provider__membership__user",
            "appointment__patient",
        ).get(id=previous)
        doctor_for(request, row)
        live_room(row, window=False)
        return row
    for key in sorted(
        [f"calls:instant-provider:{provider.id}", f"calls:instant-patient:{patient.id}"]
    ):
        advisory_lock(key)
    existing = (
        AppointmentRoom.objects.filter(
            timing_mode="instant",
            ended_at__isnull=True,
            appointment__status__in=["booked", "checked_in", "in_service"],
        )
        .filter(Q(appointment__provider=provider) | Q(bound_patient=patient))
        .select_related(
            "appointment__branch__organization",
            "appointment__provider__membership__user",
            "appointment__patient",
        )
    )
    for room in existing:
        try:
            live_room(room, window=False)
        except DomainError:
            continue
        if (
            room.appointment.provider_id == provider.id
            and room.bound_patient_id == patient.id
            and room.bound_branch_id == branch.id
        ):
            doctor_for(request, room)
            record_request_result(
                request.user,
                data.organization_id,
                "calls.instant",
                data.request_id,
                payload,
                room.id,
            )
            return room
        raise DomainError(
            "CONFLICT",
            "An instant room is already open for this doctor or patient. End that room before creating another.",
            409,
        )
    now = timezone.now()
    # Appointment storage requires an ordered pair. These are recording anchors,
    # not a booked slot or a room deadline. No Reservation is created.
    appointment = Appointment.objects.create(
        organization_id=data.organization_id,
        branch=branch,
        patient=patient,
        provider=provider,
        start=now,
        end=now + timedelta(microseconds=1),
        reason=data.reason,
        created_by=request.user,
    )
    row = create_room(request, appointment, timing_mode="instant")
    event(
        request,
        branch,
        appointment,
        "appointment.instant_created",
        after={"room_id": str(row.id), "timing_mode": "instant"},
    )
    record_request_result(
        request.user, data.organization_id, "calls.instant", data.request_id, payload, row.id
    )
    return row
