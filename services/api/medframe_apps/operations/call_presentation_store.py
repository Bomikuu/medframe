"""Ephemeral Redis collaboration state, independent of clinical record versions."""

import json
import time
from uuid import uuid4

from redis import Redis, WatchError
from redis.exceptions import RedisError

from config.errors import DomainError
from config.runtime import get_settings
from medframe_apps.operations.call_policy import (
    participant_for,
    room_access_seconds,
    socket_request,
)
from medframe_apps.operations.call_presentation_protocol import (
    ASSETS,
    validate_camera,
    validate_part,
    validate_scene,
)


def presentation_authority(scope, identifier):
    return participant_for(socket_request(scope), identifier)


def connection():
    return Redis.from_url(
        get_settings().redis_url, socket_timeout=1, socket_connect_timeout=1, decode_responses=True
    )


def state_key(identifier, generation):
    return f"medframe:call-model:{identifier}:{generation}"


def empty_state(row):
    return {
        "protocol_version": 1,
        "generation": row.generation,
        "epoch": None,
        "revision": 0,
        "active": False,
        "model": None,
        "asset_version": None,
        "presenter": None,
        "camera": None,
        "scene_revision": 0,
        "scene": {"view": "front", "jaw": "both", "isolate": False},
        "doctor_focus": None,
        "patient_pointer": None,
        "allow_patient_selection": False,
        "selection_epoch": 0,
        "actor": "doctor",
    }


def unavailable():
    return DomainError(
        "PRESENTATION_UNAVAILABLE",
        "Model sharing is temporarily unavailable. Your call and chat can continue.",
        503,
    )


def presentation_snapshot(row, participant):
    try:
        with connection() as client:
            raw = client.get(state_key(row.id, row.generation))
            return json.loads(raw) if raw else empty_state(row)
    except (RedisError, ValueError):
        raise unavailable() from None


def transition(state, participant, command):
    action = command["action"]
    if command["epoch"] != state["epoch"]:
        raise DomainError(
            "PRESENTATION_STALE",
            "The shared model changed. Its latest view has been requested.",
            409,
        )
    doctor = participant.role == "doctor"
    if action in {"point_at_part", "clear_pointer"}:
        if (
            doctor
            or not state["active"]
            or not state["allow_patient_selection"]
            or command["selection_epoch"] != state["selection_epoch"]
        ):
            raise DomainError(
                "SELECTION_DISABLED",
                "Selection is off. You can keep following your doctor’s view.",
                403,
            )
        state["patient_pointer"] = (
            validate_part(command["part"], state["model"]) if action == "point_at_part" else None
        )
    else:
        if not doctor:
            raise DomainError("FORBIDDEN", "Only your doctor can control this presentation.", 403)
        if action != "start_presentation" and (
            not state["active"] or state["presenter"] != str(participant.id)
        ):
            raise DomainError(
                "PRESENTATION_STALE",
                "Start a new model presentation from this doctor session.",
                409,
            )
        if action == "start_presentation":
            state.update(
                epoch=str(uuid4()),
                active=True,
                model=command["model"],
                asset_version=ASSETS[command["model"]],
                presenter=str(participant.id),
                camera=None,
                doctor_focus=None,
                patient_pointer=None,
                allow_patient_selection=False,
                selection_epoch=state["selection_epoch"] + 1,
                scene_revision=state["scene_revision"] + 1,
                scene={"view": "front", "jaw": "both", "isolate": False},
            )
        elif action == "set_camera":
            if command["scene_revision"] != state["scene_revision"]:
                raise DomainError(
                    "PRESENTATION_STALE", "A newer model view is already active.", 409
                )
            state["camera"] = validate_camera(command["camera"], state["model"])
        elif action == "set_focus":
            state["doctor_focus"] = validate_scene(command, state["model"])
            state["scene"] = {key: command[key] for key in ("view", "jaw", "isolate")}
            state["camera"] = None
            state["scene_revision"] += 1
        elif action == "set_selection_permission":
            state["allow_patient_selection"] = command["allowed"]
            state["selection_epoch"] += 1
            state["patient_pointer"] = None
        elif action == "stop_presentation":
            state.update(
                active=False,
                camera=None,
                doctor_focus=None,
                patient_pointer=None,
                allow_patient_selection=False,
                selection_epoch=state["selection_epoch"] + 1,
            )
    state["revision"] += 1
    state["actor"] = participant.role
    return state


def apply_presentation_command(scope, identifier, command):
    # Reauthorize inside every CAS attempt; Redis WATCH serializes permission/camera races.
    try:
        with connection() as client:
            for _ in range(4):
                row, participant = presentation_authority(scope, identifier)
                rate_key = f"medframe:call-model-rate:{participant.id}:{int(time.time())}"
                action = command["action"]
                limit = (
                    20
                    if action == "set_camera"
                    else 5
                    if action in {"point_at_part", "clear_pointer"}
                    else 10
                )
                count = client.incr(f"{rate_key}:{action}")
                client.expire(f"{rate_key}:{action}", 2)
                if count > limit:
                    raise DomainError(
                        "PRESENTATION_RATE",
                        "Please wait a moment before changing the shared model.",
                        429,
                    )
                key = state_key(row.id, row.generation)
                with client.pipeline() as pipe:
                    try:
                        pipe.watch(key)
                        raw = pipe.get(key)
                        state = json.loads(raw) if raw else empty_state(row)
                        value = transition(state, participant, command)
                        ttl = room_access_seconds(row)
                        if ttl < 1:
                            raise DomainError("ROOM_ENDED", "This appointment room has ended.", 410)
                        pipe.multi()
                        pipe.set(key, json.dumps(value, allow_nan=False), ex=ttl)
                        pipe.execute()
                        return value
                    except WatchError:
                        continue
            raise DomainError(
                "PRESENTATION_STALE", "The shared model changed. Please try again.", 409
            )
    except RedisError:
        raise unavailable() from None


def clear_presentation(identifier, generation):
    try:
        with connection() as client:
            client.delete(state_key(identifier, generation))
    except RedisError:
        # Access policy remains authoritative even if ephemeral cleanup is unavailable.
        pass
