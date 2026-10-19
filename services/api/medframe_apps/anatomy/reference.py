"""Versioned source geometry metadata; public reference contains no patient data."""

import json
from functools import lru_cache
from pathlib import Path

from config.errors import DomainError

ROOT = Path(__file__).resolve().parents[4]


@lru_cache(maxsize=1)
def anatomy_reference(version=1):
    if version != 1:
        raise DomainError("INVALID_INPUT", "This anatomy reference version is unavailable.")
    return json.loads((ROOT / "assets/anatomy/manifest.json").read_text())


def validate_anatomy_location(registry_version, layer, structure_id, side, anchor):
    reference = anatomy_reference(registry_version)
    entry = next((item for item in reference["structures"] if item["id"] == structure_id), None)
    if entry is None or entry["layer"] != layer or side not in entry["sides"]:
        raise ValueError("Choose a supported structure, layer and patient side")
    if anchor:
        if anchor.kind == "model":
            if anchor.asset_version != entry["asset_version"] or anchor.mesh_id != entry["mesh_id"]:
                raise ValueError("Anchor belongs to another asset or structure")
            for value, lower, upper in zip(
                anchor.point, entry["bounds"]["min"], entry["bounds"]["max"], strict=True
            ):
                if not lower - 0.0001 <= value <= upper + 0.0001:
                    raise ValueError("Anchor is outside the selected mesh bounds")
        elif anchor.reference_version != registry_version or anchor.view not in entry["views"]:
            raise ValueError("Map anchor belongs to another reference or view")
    return entry
