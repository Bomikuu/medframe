import json
from datetime import timedelta
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user
from django.contrib.sessions.backends.db import SessionStore
from django.utils import timezone
from redis import Redis

from config.crypto import digest
from config.errors import DomainError
from config.runtime import ROOT, get_settings
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.accounts.sign_in_policy import authenticated_session
from medframe_apps.operations.call_models import AppointmentRoom, RoomParticipant
from medframe_apps.operations.policy import consultation_setup, require_operations
from medframe_apps.providers.models import ProviderProfile

COOKIE = "medframe_call"


def media_config():
    try:
        return json.loads((ROOT / ".medframe-runtime/media/credentials.json").read_text())
    except (OSError, ValueError):
        raise DomainError(
            "MEDIA_UNAVAILABLE", "The call server is not running. Contact your clinic.", 503
        ) from None


def media_healthy():
    try:
        with Redis.from_url(
            get_settings().redis_url, socket_timeout=1, socket_connect_timeout=1
        ) as client:
            if client.get("medframe:call-media:lease"):
                return True
    except Exception:
        pass
    return False


def room_for(identifier, *, lock=False):
    from uuid import UUID

    identifier = UUID(str(identifier))
    query = AppointmentRoom.objects.select_related(
        "appointment__branch__organization",
        "appointment__patient",
        "appointment__provider__membership__user",
        "claimed_provider__membership__user",
    )
    row = (query.select_for_update(of=("self",)) if lock else query).filter(id=identifier).first()
    if not row:
        raise DomainError("NOT_FOUND", "This appointment room is unavailable.", 404)
    return row


def live_room(row, *, window=True):
    appointment, now = row.appointment, timezone.now()
    if (
        appointment.patient_id != row.bound_patient_id
        or appointment.branch_id != row.bound_branch_id
    ):
        raise DomainError(
            "ROOM_ENDED",
            "This appointment's identity or branch has changed. Contact your clinic.",
            410,
        )
    if (row.doctor_mode == "assigned" or row.claimed_provider_id) and (
        not appointment.provider.membership.active
        or not appointment.provider.membership.user.is_active
    ):
        raise DomainError(
            "ROOM_ENDED",
            "The clinic must assign an active doctor before this room can be used.",
            410,
        )
    if (
        row.ended_at
        or appointment.status in {"cancelled", "no_show", "completed"}
        or (row.timing_mode == "scheduled" and now >= row.scheduled_end)
        or appointment.start != row.scheduled_start
        or appointment.end != row.scheduled_end
        or (row.claimed_provider_id and appointment.provider_id != row.claimed_provider_id)
    ):
        raise DomainError(
            "ROOM_ENDED",
            "This appointment room has ended or its schedule has changed. Contact your clinic.",
            410,
        )
    if not appointment.branch.organization.active:
        raise DomainError("ROOM_ENDED", "This appointment room is no longer available.", 410)
    if (
        window
        and row.timing_mode == "scheduled"
        and now < row.scheduled_start - timedelta(minutes=10)
    ):
        zone = ZoneInfo(appointment.branch.organization.timezone)
        opens = (
            (row.scheduled_start - timedelta(minutes=10))
            .astimezone(zone)
            .strftime("%B %d, %Y at %I:%M %p")
        )
        raise DomainError(
            "ROOM_EARLY",
            f"This room opens on {opens} ({zone.key}).",
            403,
        )


def room_access_seconds(row):
    # Instant-room cookies renew on snapshots. This is a browser-session lifetime,
    # not a room deadline; every request/socket still rechecks live authorization.
    if row.timing_mode == "instant":
        return 24 * 60 * 60
    return max(1, int((row.scheduled_end - timezone.now()).total_seconds()))


def native_request(session_key):
    session = SessionStore(session_key=session_key)
    user = get_user(SimpleNamespace(session=session))
    now = timezone.now()
    if (
        not user.is_authenticated
        or not user.is_active
        or not authenticated_session(user, session)
        or session.get("auth_realm", "staff") != "staff"
        or not ClinicalSession.objects.filter(
            user=user,
            session_key=session_key,
            realm="staff",
            revoked=False,
            expires_at__gt=now,
            last_seen_at__gt=now - timedelta(minutes=30),
        ).exists()
    ):
        raise DomainError(
            "UNAUTHENTICATED", "Sign in with your clinic account to join as doctor.", 401
        )
    return SimpleNamespace(user=user, session=session, META={})


def doctor_for(request, row):
    native_request(request.session.session_key)
    appointment = row.appointment
    member = require_operations(
        request, appointment.organization_id, "encounters.write", appointment.branch_id
    )
    provider = ProviderProfile.objects.filter(
        membership=member, membership__active=True, membership__user__is_active=True
    ).first()
    if (
        not provider
        or (row.doctor_mode == "assigned" and provider.id != appointment.provider_id)
        or (row.claimed_provider_id and row.claimed_provider_id != provider.id)
    ):
        raise DomainError(
            "FORBIDDEN",
            "This room needs its assigned doctor or an eligible unclaimed clinic doctor.",
            403,
        )
    if consultation_setup(
        request,
        appointment.organization_id,
        appointment.patient_id,
        provider.id,
        appointment.branch_id,
    ):
        raise DomainError(
            "FORBIDDEN",
            "Your provider and patient-access setup must be complete before joining.",
            403,
        )
    return provider


def participant_for(request, identifier, *, health=False, lobby=False):
    row = room_for(identifier)
    live_room(row)
    if row.started:
        current = row.participants.filter(
            role="doctor", generation=row.generation, revoked=False
        ).first()
        try:
            if not current:
                raise DomainError("FORBIDDEN", "Doctor session unavailable.", 403)
            doctor_for(native_request(current.native_session_key), row)
        except DomainError:
            raise DomainError(
                "ROOM_ENDED", "The doctor’s access to this appointment has ended.", 410
            ) from None
    proof = request.COOKIES.get(COOKIE, "")
    participant = (
        RoomParticipant.objects.filter(
            room=row, proof_hash=digest(proof), generation=row.generation, revoked=False
        ).first()
        if 40 <= len(proof) <= 100
        else None
    )
    if not participant:
        if (
            40 <= len(proof) <= 100
            and RoomParticipant.objects.filter(
                room=row, proof_hash=digest(proof), role="patient", revoked=True, admitted=False
            ).exists()
        ):
            raise DomainError(
                "WAITING_REMOVED",
                "The doctor closed this waiting session. Contact your clinic or request entry again.",
                403,
            )
        raise DomainError(
            "ROOM_ACCESS_REQUIRED", "Enter the room PIN or join with your doctor account.", 403
        )
    if participant.role == "doctor":
        if (
            request.session.session_key != participant.native_session_key
            or request.user.id != participant.user_id
        ):
            raise DomainError("FORBIDDEN", "Use the doctor session that joined this room.", 403)
        doctor_for(request, row)
    if participant.role == "patient" and not participant.admitted and not lobby:
        raise DomainError(
            "WAITING_FOR_ADMISSION",
            "Wait for your doctor to admit you before using the call, chat or files.",
            403,
        )
    if health and not media_healthy():
        raise DomainError("MEDIA_UNAVAILABLE", "The call server is temporarily unavailable.", 503)
    return row, participant


def socket_request(scope):
    return SimpleNamespace(
        user=scope["user"], session=scope["session"], COOKIES=scope.get("cookies", {}), META={}
    )
