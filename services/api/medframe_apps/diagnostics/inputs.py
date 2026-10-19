from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, StrictInt

from medframe_apps.encounters.inputs import Input

MODALITIES = ("xray", "laboratory", "ultrasound", "ct", "mri", "other")


class DraftInput(Input):
    id: UUID | None = None
    patient_id: UUID
    encounter_id: UUID | None = None
    expected_version: StrictInt = Field(ge=0)
    modality: Literal["xray", "laboratory", "ultrasound", "ct", "mri", "other"]
    test_name: str = Field(min_length=1, max_length=160)
    region: str = Field(default="", max_length=120)
    question: str = Field(min_length=1, max_length=4000)
    instructions: str = Field(default="", max_length=2000)
    urgency: Literal["routine", "urgent"] = "routine"
    requested_by: date | None = None
    document_version_ids: list[UUID] = Field(default_factory=list, max_length=20)


class ActionInput(Input):
    id: UUID
    expected_version: StrictInt = Field(ge=1)
    center_id: UUID | None = None
    result_id: UUID | None = None
    reason: str = Field(default="", max_length=240)
    preview_digest: str = Field(default="", max_length=64)
    performed_at: datetime | None = None
    report: str = Field(default="", max_length=12000)
    accession: str = Field(default="", max_length=120)
    interpretation: str = Field(default="", max_length=4000)
    next_steps: str = Field(default="", max_length=2000)
    acknowledged: bool = False
