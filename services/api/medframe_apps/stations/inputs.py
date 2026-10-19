from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class DeviceInput(Input):
    name: str = Field(min_length=1, max_length=80)
    branch_id: UUID
    mode: Literal["clinician", "kiosk", "display"]
    functions: list[str] = Field(max_length=6)
    strict_verification: bool | None = None


class EditorSelection(Input):
    tab: Literal["notes", "dental", "anatomy", "procedures", "documents", "visit", "plan"] = (
        "dental"
    )
    tooth: str = Field(default="16", pattern=r"^[1-8][1-8]$")
    surface: (
        Literal["mesial", "distal", "buccal", "labial", "lingual", "palatal", "occlusal", "incisal"]
        | None
    ) = None
    structure: str = Field(default="", max_length=160, pattern=r"^[a-zA-Z0-9_.-]*$")
    layer: Literal["body", "skeleton"] = "body"


class OfferInput(Input):
    expected_version: int = Field(ge=1)
    kind: Literal["device", "responsibility"] = "device"
    provider_id: UUID | None = None
    summary: str = Field(default="", max_length=1200)
    tasks: str = Field(default="", max_length=1200)
    selection: EditorSelection = Field(default_factory=EditorSelection)


class WalkInInput(Input):
    organization_id: UUID
    branch_id: UUID
    request_id: UUID
    patient_id: UUID | None = None
    new_patient: dict | None = None
    reason: str = Field(min_length=1, max_length=240)
    content: dict
