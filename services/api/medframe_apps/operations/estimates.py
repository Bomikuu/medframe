"""Setting-based queue simulation; a range is guidance, never a promise."""

from dataclasses import dataclass
from datetime import datetime, timedelta
from math import ceil, floor


@dataclass
class EstimateInput:
    tickets: list[dict]
    windows: dict[str, list[tuple[datetime, datetime]]]
    occupied: list[dict]


def estimate_queue(snapshot: EstimateInput, now: datetime):
    occupied = list(snapshot.occupied)
    result = {}
    for ticket in snapshot.tickets:
        if ticket["status"] == "in_service":
            result[ticket["id"]] = {
                "minimum": 0,
                "maximum": 0,
                "label": "Currently consulting",
                "basis": "setting_based",
                "calculated_at": now.isoformat(),
            }
            continue
        if ticket["status"] not in {"waiting", "called"}:
            continue
        provider, resource = ticket["provider"], ticket["resource"]
        duration = timedelta(minutes=ticket["duration"])
        earliest = now + timedelta(minutes=ticket["delay"])
        predicted = None
        for opens, closes in snapshot.windows.get(provider, []):
            cursor = max(earliest, opens)
            while cursor + duration <= closes:
                end = cursor + duration
                conflicts = [
                    row
                    for row in occupied
                    if (row["provider"] == provider or (resource and row["resource"] == resource))
                    and row["start"] < end
                    and cursor < row["end"]
                ]
                if not conflicts:
                    predicted = cursor
                    break
                cursor = max(row["end"] for row in conflicts)
            if predicted is not None:
                break
        if predicted is None:
            result[ticket["id"]] = {
                "minimum": None,
                "maximum": None,
                "label": "Estimate unavailable — ask reception",
                "basis": "setting_based",
                "calculated_at": now.isoformat(),
            }
            continue
        minutes = max(0, (predicted - now).total_seconds() / 60)
        minimum = floor(minutes * 0.75 / 5) * 5
        maximum = ceil(minutes * 1.25 / 5) * 5
        result[ticket["id"]] = {
            "minimum": minimum,
            "maximum": maximum,
            "label": "Up next" if minutes == 0 else f"{minimum}–{maximum} min",
            "basis": "setting_based",
            "calculated_at": now.isoformat(),
        }
        occupied.append(
            {
                "provider": provider,
                "resource": resource,
                "start": predicted,
                "end": predicted + duration,
            }
        )
    return result
