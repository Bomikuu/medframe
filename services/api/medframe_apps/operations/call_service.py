import secrets
from datetime import timedelta
from uuid import UUID

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone

from config.crypto import cipher, digest
from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version, advisory_lock
from medframe_apps.operations.call_models import (
    AppointmentRoom,
    RoomAttachment,
    RoomMessage,
    RoomParticipant,
)
from medframe_apps.operations.call_policy import (
    COOKIE,
    doctor_for,
    live_room,
    media_healthy,
    participant_for,
    room_for,
    native_request,
)
from medframe_apps.operations.models import Appointment, QueueTicket
from medframe_apps.operations.policy import require_operations, require_provider_scope
from medframe_apps.operations.reservations import claim_reservation


def notify(identifier):
    async_to_sync(get_channel_layer().group_send)(
        f"call.{identifier.hex}", {"type": "room.changed"}
    )


def changed(row, request, action):
    row.version += 1
    row.save()
    audit(request.user, f"call.{action}", row.appointment.organization_id, row.id)
    transaction.on_commit(lambda: notify(row.id))
    if action in {"end", "access_regenerated", "remove_patient"}:
        from medframe_apps.operations.call_presentation_store import clear_presentation

        generation = row.generation - 1 if action == "access_regenerated" else row.generation
        transaction.on_commit(lambda: clear_presentation(row.id, generation))


def fresh_pin(row):
    pin = f"{secrets.randbelow(1_000_000):06d}"
    row.pin_hash = make_password(pin)
    row.pin_display = cipher().encrypt(pin.encode()).decode()


@transaction.atomic
def create_room(request, appointment, mode="assigned", *, timing_mode="scheduled"):
    member = require_operations(
        request, appointment.organization_id, "appointments.manage", appointment.branch_id
    )
    require_provider_scope(member, appointment.provider_id)
    if mode not in {"assigned", "eligible"}:
        raise DomainError("INVALID_INPUT", "Choose assigned or eligible clinic doctor.")
    if not isinstance(timing_mode, str) or timing_mode not in {"scheduled", "instant"}:
        raise DomainError("INVALID_INPUT", "Choose a scheduled or instant room.")
    appointment = Appointment.objects.select_for_update().get(id=appointment.id)
    if appointment.status not in {"booked", "checked_in"} or (
        timing_mode == "scheduled" and appointment.end <= timezone.now()
    ):
        raise DomainError("CONFLICT", "Use an active booked or checked-in appointment.", 409)
    existing = AppointmentRoom.objects.filter(appointment=appointment).first()
    if existing:
        return existing
    row = AppointmentRoom(
        appointment=appointment,
        bound_patient=appointment.patient,
        bound_branch=appointment.branch,
        doctor_mode=mode,
        scheduled_start=appointment.start,
        scheduled_end=appointment.end,
        timing_mode=timing_mode,
    )
    if timing_mode == "instant":
        doctor_for(request, row)
    fresh_pin(row)
    row.save()
    audit(request.user, "call.created", appointment.organization_id, row.id)
    return row


def manager(request, row):
    member = require_operations(
        request, row.appointment.organization_id, "appointments.manage", row.appointment.branch_id
    )
    require_provider_scope(member, row.appointment.provider_id)
    return member


def summary(row, *, private=False):
    from medframe_apps.operations.call_connection import connection_summary

    value = {
        "id": str(row.id),
        "version": row.version,
        "generation": row.generation,
        "doctor_mode": row.doctor_mode,
        "timing_mode": row.timing_mode,
        "started": row.started,
        "start": row.scheduled_start.isoformat(),
        "end": row.scheduled_end.isoformat(),
        "server_now": timezone.now().isoformat(),
        "timezone": row.appointment.branch.organization.timezone,
        "media_ready": media_healthy(),
        "connection": connection_summary(),
    }
    if private:
        value.update(
            {
                "patient": row.appointment.patient.full_name,
                "doctor": row.appointment.provider.membership.user.display_name or "Doctor",
                "patient_id": str(row.appointment.patient_id),
                "organization_id": str(row.appointment.organization_id),
                "timezone": row.appointment.branch.organization.timezone,
            }
        )
    return value


def snapshot(request, identifier):
    row, participant = participant_for(request, identifier, lobby=True)
    now = timezone.now()
    if participant.role == "patient":
        RoomParticipant.objects.filter(id=participant.id, revoked=False).update(last_seen_at=now)
    value = summary(row, private=True)
    waiting = row.participants.filter(
        role="patient", revoked=False, generation=row.generation
    ).first()
    value.update(
        {
            "role": participant.role,
            "participant_id": str(participant.id),
            "admitted": participant.role == "doctor" or participant.admitted,
            "device_checks": participant.device_checks,
            "patient_waiting": bool(waiting and not waiting.admitted),
        }
    )
    if participant.role == "doctor":
        value["patient_lobby"] = (
            {
                "id": str(waiting.id),
                "arrived_at": waiting.created_at.isoformat(),
                "last_seen_at": waiting.last_seen_at.isoformat() if waiting.last_seen_at else None,
                "admitted": waiting.admitted,
                "device_checks": waiting.device_checks,
            }
            if waiting
            else None
        )
    if participant.role == "doctor":
        value["encounter_id"] = str(row.encounter_id) if row.encounter_id else None
    if participant.role == "doctor" or participant.admitted:
        from medframe_apps.operations.call_clinical import aftercare_data

        value["aftercare"] = aftercare_data(row)
    if participant.role == "patient" and not participant.admitted:
        value.update({"messages": [], "files": [], "history_limited": False})
        return value
    messages = list(
        RoomMessage.objects.filter(room=row)
        .select_related("participant")
        .order_by("-sequence")[:100]
    )
    value.update(
        {
            "role": participant.role,
            "participant_id": str(participant.id),
            "messages": [message_data(item) for item in reversed(messages)],
            "history_limited": row.next_sequence > 101,
            "files": [
                {
                    "id": str(item.id),
                    "filename": item.filename,
                    "size": item.size,
                    "state": item.scan_state,
                    "role": item.participant.role,
                }
                for item in RoomAttachment.objects.filter(room=row)
                .select_related("participant")
                .order_by("-created_at")[:100]
            ],
        }
    )
    return value


def message_data(message):
    return {
        "id": str(message.id),
        "sequence": message.sequence,
        "role": message.participant.role,
        "body": message.body,
        "sent_at": message.created_at.isoformat(),
        "request_id": str(message.request_id),
    }


def history(request, identifier, before):
    row, _ = participant_for(request, identifier)
    if type(before) is not int or before < 1:
        raise DomainError("INVALID_INPUT", "Choose a valid conversation position.")
    rows = list(
        RoomMessage.objects.filter(room=row, sequence__lt=before)
        .select_related("participant")
        .order_by("-sequence")[:101]
    )
    return {
        "messages": [message_data(item) for item in reversed(rows[:100])],
        "has_more": len(rows) > 100,
    }


@transaction.atomic
def join(request, identifier, *, doctor=False, pin=""):
    if doctor:
        native_request(request.session.session_key)
        advisory_lock(f"calls:doctor:{request.user.id}")
    row = room_for(identifier, lock=True)
    live_room(row)
    if not media_healthy():
        raise DomainError(
            "MEDIA_UNAVAILABLE",
            "The call server is temporarily unavailable. Try again shortly.",
            503,
        )
    role = "doctor" if doctor else "patient"
    if not doctor and (
        not isinstance(pin, str)
        or len(pin) != 6
        or not pin.isascii()
        or not pin.isdigit()
        or not check_password(pin, row.pin_hash)
    ):
        raise DomainError(
            "INVALID_PIN",
            "The room code is incorrect or unavailable. Check it with your clinic.",
            403,
        )
    provider = doctor_for(request, row) if doctor else None
    existing = RoomParticipant.objects.filter(room=row, role=role, revoked=False).first()
    proof = request.COOKIES.get(COOKIE, "")
    if existing:
        if (
            existing.proof_hash == digest(proof)
            and existing.generation == row.generation
            and (not doctor or existing.native_session_key == request.session.session_key)
        ):
            return row, proof
        raise DomainError(
            "ROOM_OCCUPIED",
            "This participant already joined from another browser. Ask the clinic to reset room access.",
            409,
        )
    if doctor:
        for previous in (
            RoomParticipant.objects.filter(user=request.user, role="doctor", revoked=False)
            .exclude(room=row)
            .select_related(
                "room__appointment__branch__organization",
                "room__appointment__provider__membership__user",
            )
        ):
            try:
                live_room(previous.room, window=False)
                doctor_for(request, previous.room)
            except DomainError:
                previous.revoked = True
                previous.save(update_fields=["revoked"])
            else:
                raise DomainError(
                    "CONFLICT", "End your other online appointment before joining this one.", 409
                )
        appointment = (
            Appointment.objects.select_for_update()
            .select_related("branch", "patient", "provider__membership")
            .get(id=row.appointment_id)
        )
        if provider.id != appointment.provider_id:
            if QueueTicket.objects.filter(appointment=appointment).exists():
                raise DomainError(
                    "CONFLICT",
                    "Reception must reassign the checked-in visit before another doctor can claim it.",
                    409,
                )
            appointment.provider = provider
            appointment.version += 1
            appointment.save(update_fields=["provider", "version"])
            claim_reservation(
                appointment,
                provider,
                appointment.patient,
                appointment.resource,
                appointment.start,
                appointment.end,
            )
            row.appointment = appointment
        row.claimed_provider = provider
    proof = secrets.token_urlsafe(40)
    RoomParticipant.objects.create(
        room=row,
        role=role,
        user=request.user if doctor else None,
        native_session_key=request.session.session_key if doctor else "",
        proof_hash=digest(proof),
        generation=row.generation,
        admitted=doctor,
        last_seen_at=timezone.now(),
    )
    changed(row, request, "doctor_joined" if doctor else "patient_joined")
    return row, proof


@transaction.atomic
def room_action(request, identifier, data):
    row = room_for(identifier, lock=True)
    action = data.get("action")
    if action in {"manage", "regenerate"}:
        manager(request, row)
        if action == "manage":
            try:
                live_room(row, window=False)
            except DomainError:
                return {**summary(row), "pin": "", "needs_reset": True}
        if action == "regenerate":
            check_version(row.version, data.get("expected_version"))
            timing_mode = data.get("timing_mode", row.timing_mode)
            if not isinstance(timing_mode, str) or timing_mode not in {"scheduled", "instant"}:
                raise DomainError("INVALID_INPUT", "Choose a scheduled or instant room.")
            if timing_mode == "instant":
                doctor_for(request, row)
            appointment = Appointment.objects.select_for_update().get(id=row.appointment_id)
            if appointment.status not in {"booked", "checked_in"} or (
                timing_mode == "scheduled" and appointment.end <= timezone.now()
            ):
                raise DomainError(
                    "ROOM_ENDED",
                    "Book or reschedule an appointment before creating new access.",
                    410,
                )
            row.appointment = appointment
            row.timing_mode = timing_mode
            row.scheduled_start, row.scheduled_end = appointment.start, appointment.end
            row.ended_at = None
            row.claimed_provider = None
            row.generation += 1
            row.started = False
            row.participants.filter(revoked=False).update(revoked=True)
            fresh_pin(row)
            changed(row, request, "access_regenerated")
        return {**summary(row), "pin": cipher().decrypt(row.pin_display.encode()).decode()}
    _, participant = participant_for(request, identifier)
    if participant.role != "doctor":
        raise DomainError("FORBIDDEN", "Only the current doctor can manage the call.", 403)
    check_version(row.version, data.get("expected_version"))
    if action in {"admit_patient", "remove_patient"}:
        try:
            target_id = UUID(str(data.get("participant_id", "")))
        except (ValueError, TypeError):
            raise DomainError(
                "INVALID_INPUT", "Select the current waiting patient session."
            ) from None
        target = (
            row.participants.select_for_update()
            .filter(id=target_id, role="patient", generation=row.generation, revoked=False)
            .first()
        )
        if target is None:
            raise DomainError(
                "CONFLICT", "This patient session has changed. Refresh the room.", 409
            )
        if action == "admit_patient":
            if not target.admitted:
                target.admitted, target.admitted_at = True, timezone.now()
                target.save(update_fields=["admitted", "admitted_at"])
        else:
            if target.admitted:
                raise DomainError(
                    "CONFLICT",
                    "This patient is already admitted. End the room to close active care.",
                    409,
                )
            target.revoked = True
            target.save(update_fields=["revoked"])
        changed(row, request, action)
        return summary(row)
    if action == "start":
        if row.timing_mode == "scheduled" and timezone.now() < row.scheduled_start:
            raise DomainError(
                "ROOM_EARLY", "Start the call at the scheduled appointment time.", 403
            )
        if (
            QueueTicket.objects.filter(service_user=request.user, status="in_service")
            .exclude(patient_id=row.appointment.patient_id)
            .exists()
        ):
            raise DomainError(
                "CONFLICT",
                "Complete your current patient’s queue service before starting this appointment.",
                409,
            )
        row.started = True
    elif action == "end":
        row.ended_at = timezone.now()
        row.started = False
        row.participants.update(revoked=True)
    elif action == "extend":
        if row.timing_mode == "instant":
            raise DomainError("INVALID_INPUT", "Instant rooms stay open until you end them.")
        minutes = data.get("minutes")
        if type(minutes) is not int or minutes not in {5, 10, 15, 30}:
            raise DomainError("INVALID_INPUT", "Extend by 5, 10, 15 or 30 minutes.")
        appointment = (
            Appointment.objects.select_for_update(of=("self",))
            .select_related("branch", "provider__membership", "patient", "resource")
            .get(id=row.appointment_id)
        )
        end = row.scheduled_end + timedelta(minutes=minutes)
        if end - appointment.start > timedelta(hours=4):
            raise DomainError("CONFLICT", "A room cannot exceed four hours. Book a follow-up.", 409)
        claim_reservation(
            appointment,
            appointment.provider,
            appointment.patient,
            appointment.resource,
            appointment.start,
            end,
        )
        appointment.end = end
        appointment.version += 1
        appointment.save(update_fields=["end", "version"])
        row.appointment, row.scheduled_end = appointment, end
    else:
        raise DomainError("INVALID_INPUT", "Choose a supported room action.")
    changed(row, request, action)
    return summary(row)


@transaction.atomic
def send_message(request, identifier, data):
    room_for(identifier, lock=True)
    row, participant = participant_for(request, identifier)
    body = data.get("body", "")
    request_id = UUID(str(data.get("request_id", "")))
    if (
        not isinstance(body, str)
        or not body.strip()
        or len(body) > 2000
        or any(ord(char) < 32 and char not in "\n\t\r" for char in body)
    ):
        raise DomainError("INVALID_INPUT", "Write a message of up to 2,000 characters.")
    existing = RoomMessage.objects.filter(participant=participant, request_id=request_id).first()
    if existing:
        if existing.body != body.strip():
            raise DomainError("CONFLICT", "This message retry has changed.", 409)
        return message_data(existing)
    message = RoomMessage.objects.create(
        room=row,
        participant=participant,
        sequence=row.next_sequence,
        request_id=request_id,
        body=body.strip(),
    )
    row.next_sequence += 1
    row.save(update_fields=["next_sequence"])
    transaction.on_commit(lambda: notify(row.id))
    if action in {"end", "access_regenerated", "remove_patient"}:
        from medframe_apps.operations.call_presentation_store import clear_presentation

        generation = row.generation - 1 if action == "access_regenerated" else row.generation
        transaction.on_commit(lambda: clear_presentation(row.id, generation))
    return message_data(message)


@transaction.atomic
def update_readiness(request, identifier, data):
    room_for(identifier, lock=True)
    row, participant = participant_for(request, identifier, lobby=True)
    checks = data.get("checks")
    if participant.role != "patient":
        raise DomainError("FORBIDDEN", "Only the patient can report their device readiness.", 403)
    if (
        not isinstance(checks, dict)
        or set(checks) != {"camera", "microphone", "speaker"}
        or any(type(value) is not bool for value in checks.values())
    ):
        raise DomainError(
            "INVALID_INPUT", "Report only camera, microphone and speaker check status."
        )
    changed_checks = participant.device_checks != checks
    participant.device_checks = checks
    participant.last_seen_at = timezone.now()
    participant.save(update_fields=["device_checks", "last_seen_at"])
    if changed_checks:
        transaction.on_commit(lambda: notify(row.id))
    if action in {"end", "access_regenerated", "remove_patient"}:
        from medframe_apps.operations.call_presentation_store import clear_presentation

        generation = row.generation - 1 if action == "access_regenerated" else row.generation
        transaction.on_commit(lambda: clear_presentation(row.id, generation))
    return {"reported": True}
