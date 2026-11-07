"""Allowlisted educational scene state only; no clinical record payloads."""

import json
import math
from uuid import UUID

from config.errors import DomainError
from medframe_apps.anatomy.reference import anatomy_reference

ASSETS = {
    "dental": "dundee-permanent-v1",
    "body": "anatomy-body-v1",
    "skeleton": "anatomy-skeleton-v1",
}
TEETH = {f"{quadrant}{tooth}" for quadrant in range(1, 5) for tooth in range(1, 9)}
SURFACES = {
    "mesial",
    "distal",
    "facial",
    "buccal",
    "labial",
    "lingual",
    "palatal",
    "occlusal",
    "incisal",
}
FIELDS = {
    "start_presentation": {"model"},
    "set_camera": {"camera", "scene_revision"},
    "set_focus": {"focus", "view", "jaw", "isolate"},
    "set_selection_permission": {"allowed"},
    "stop_presentation": set(),
    "point_at_part": {"part", "selection_epoch"},
    "clear_pointer": {"selection_epoch"},
}


def invalid(message="This presentation command is unavailable."):
    return DomainError("INVALID_PRESENTATION", message)


def parse_presentation_command(raw):
    if not isinstance(raw, str) or len(raw.encode()) > 4096:
        raise invalid("Presentation messages must be smaller than 4 KB.")
    try:
        value = json.loads(raw, parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
        if not isinstance(value, dict):
            raise ValueError
        action = value.get("action")
        if action not in FIELDS or set(value) != FIELDS[action] | {
            "protocol_version",
            "action",
            "epoch",
        }:
            raise ValueError
        if type(value["protocol_version"]) is not int or value["protocol_version"] != 1:
            raise ValueError
        if value["epoch"] is not None:
            if not isinstance(value["epoch"], str):
                raise ValueError
            UUID(value["epoch"])
        if action == "start_presentation" and value["model"] not in ASSETS:
            raise ValueError
        if action == "set_selection_permission" and type(value["allowed"]) is not bool:
            raise ValueError
        for key in ("scene_revision", "selection_epoch"):
            if key in value and (
                type(value[key]) is not int or not 0 <= value[key] <= 1_000_000_000
            ):
                raise ValueError
        return value
    except (ValueError, TypeError, KeyError, RecursionError):
        raise invalid() from None


def validate_camera(value, model):
    if not isinstance(value, dict) or set(value) != {"position", "target", "up", "fov", "aspect"}:
        raise invalid("Use a supported camera pose.")
    for key in ("position", "target", "up"):
        vector = value[key]
        if not isinstance(vector, list) or len(vector) != 3:
            raise invalid()
        if any(
            type(item) not in (int, float) or not math.isfinite(item) or abs(item) > 1000
            for item in vector
        ):
            raise invalid()
    for key, lower, upper in (("fov", 10, 100), ("aspect", 0.1, 10)):
        number = value[key]
        if (
            type(number) not in (int, float)
            or not math.isfinite(number)
            or not lower <= number <= upper
        ):
            raise invalid()
    direction = [a - b for a, b in zip(value["position"], value["target"], strict=True)]
    distance = math.sqrt(sum(item * item for item in direction))
    up_length = math.sqrt(sum(item * item for item in value["up"]))
    cross = [
        direction[1] * value["up"][2] - direction[2] * value["up"][1],
        direction[2] * value["up"][0] - direction[0] * value["up"][2],
        direction[0] * value["up"][1] - direction[1] * value["up"][0],
    ]
    if (
        not 0.01 <= distance <= (100 if model == "dental" else 12)
        or not 0.5 <= up_length <= 2
        or sum(item * item for item in cross) < 1e-10
    ):
        raise invalid("The camera pose is outside this model’s viewing range.")
    return value


def validate_part(value, model):
    if (
        not isinstance(value, dict)
        or set(value) != {"id", "surface"}
        or not isinstance(value["id"], str)
    ):
        raise invalid("Choose a supported tooth or body structure.")
    if model == "dental":
        if value["id"] not in TEETH or (
            value["surface"] is not None
            and (not isinstance(value["surface"], str) or value["surface"] not in SURFACES)
        ):
            raise invalid()
        # Anatomical source meshes have no clinically reliable surface segmentation.
        # Surface identity is explicitly selected through the labeled surface control.
        if value["surface"] in {"occlusal", "incisal"}:
            anterior = int(value["id"][1]) <= 3
            if (value["surface"] == "incisal") != anterior:
                raise invalid("Choose the surface available on this tooth.")
    elif value["surface"] is not None or not any(
        item["id"] == value["id"] and item["layer"] == model
        for item in anatomy_reference(1)["structures"]
    ):
        raise invalid()
    return value


def validate_scene(command, model):
    views = (
        {"front", "upper", "lower", "left", "right"}
        if model == "dental"
        else {"front", "back", "left", "right"}
    )
    if (
        not isinstance(command["view"], str)
        or not isinstance(command["jaw"], str)
        or command["view"] not in views
        or command["jaw"] not in {"both", "upper", "lower"}
        or type(command["isolate"]) is not bool
    ):
        raise invalid()
    if model != "dental" and command["jaw"] != "both":
        raise invalid()
    focus = validate_part(command["focus"], model) if command["focus"] is not None else None
    if command["isolate"] and focus is None:
        raise invalid("Select a part before isolating it.")
    return focus
