"""Room-bound clinical orchestration; existing encounter services own all clinical writes."""

from uuid import UUID

from django.db import transaction

from config.errors import DomainError
from medframe_apps.common import check_version
from medframe_apps.encounters.models import Encounter
from medframe_apps.encounters.services import create_encounter, require_encounter
from medframe_apps.encounters.queries import encounter_summary
from medframe_apps.operations.call_models import RoomAftercare
from medframe_apps.operations.call_policy import doctor_for, participant_for, room_for
from medframe_apps.operations.call_service import changed, snapshot
from medframe_apps.patients.services import require_patient


def doctor_room(request, identifier):
    row, participant = participant_for(request, identifier)
    if participant.role != "doctor":
        raise DomainError("FORBIDDEN", "Use the current doctor's clinic session.", 403)
    provider = doctor_for(request, row)
    return row, provider


def context(request, identifier):
    row, _ = doctor_room(request, identifier)
    appointment = row.appointment
    require_patient(
        request.user, appointment.organization_id, appointment.patient_id, "patients.clinical.read"
    )
    recent = (
        Encounter.objects.filter(
            organization_id=appointment.organization_id, patient_id=appointment.patient_id
        )
        .select_related("patient", "draft", "provider__membership__user")
        .order_by("-created_at")[:12]
    )
    return {
        "encounter_id": str(row.encounter_id) if row.encounter_id else None,
        "recent": [encounter_summary(item) for item in recent],
    }


@transaction.atomic
def connect_encounter(request, identifier, data):
    room_for(identifier, lock=True)
    row, provider = doctor_room(request, identifier)
    check_version(row.version, data.get("expected_version"))
    appointment = row.appointment
    if row.encounter_id:
        raise DomainError(
            "CONFLICT", "This room already has a consultation. Refresh the panel.", 409
        )
    existing_id = data.get("encounter_id")
    if existing_id:
        try:
            identifier = UUID(str(existing_id))
        except (TypeError, ValueError):
            raise DomainError("INVALID_INPUT", "Choose an available consultation.") from None
        # Reading another provider's history is separate from claiming it for this visit.
        encounter = require_encounter(request.user, appointment.organization_id, identifier)
        if (
            encounter.patient_id != appointment.patient_id
            or encounter.branch_id != appointment.branch_id
            or encounter.provider_id != provider.id
        ):
            raise DomainError(
                "FORBIDDEN",
                "Choose this patient's consultation with your provider and branch.",
                403,
            )
    else:
        # Stable request identity makes a retried room creation use the original aggregate.
        encounter = create_encounter(
            request.user,
            appointment.organization_id,
            appointment.patient_id,
            provider.id,
            appointment.branch_id,
            appointment.reason.strip() or "Online consultation",
            row.id,
        )
    row.encounter = encounter
    changed(row, request, "consultation_linked")
    return context(request, row.id)


def aftercare_data(row):
    item = (
        row.aftercare.filter(generation=row.generation)
        .select_related("author")
        .order_by("-created_at", "-id")
        .first()
    )
    if not item:
        return None
    return {
        "id": str(item.id),
        "next_steps": item.next_steps,
        "follow_up": item.follow_up,
        "reviewed_at": item.created_at.isoformat(),
        "author": item.author.display_name or "Your doctor",
    }


@transaction.atomic
def publish_aftercare(request, identifier, data):
    room_for(identifier, lock=True)
    row, _ = doctor_room(request, identifier)
    check_version(row.version, data.get("expected_version"))
    if data.get("reviewed") is not True:
        raise DomainError("INVALID_INPUT", "Review and confirm these patient-facing instructions.")
    steps, follow_up = data.get("next_steps"), data.get("follow_up", "")
    if (
        not isinstance(steps, str)
        or not 1 <= len(steps.strip()) <= 2000
        or not isinstance(follow_up, str)
        or len(follow_up.strip()) > 500
        or any(ord(char) < 32 and char not in "\n\t\r" for char in steps + follow_up)
    ):
        raise DomainError(
            "INVALID_INPUT",
            "Enter next steps up to 2,000 characters and follow-up guidance up to 500.",
        )
    RoomAftercare.objects.create(
        room=row,
        author=request.user,
        generation=row.generation,
        next_steps=steps.strip(),
        follow_up=follow_up.strip(),
    )
    changed(row, request, "next_steps_shared")
    return snapshot(request, row.id)
