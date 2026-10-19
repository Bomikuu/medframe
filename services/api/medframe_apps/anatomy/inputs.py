from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, model_validator

from medframe_apps.anatomy.reference import validate_anatomy_location


class ModelAnchor(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["model"]
    asset_version: str = Field(max_length=80)
    mesh_id: str = Field(max_length=160)
    point: tuple[FiniteFloat, FiniteFloat, FiniteFloat]


class MapAnchor(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["map"]
    reference_version: int
    view: Literal["front", "back", "left", "right"]
    point: tuple[
        Annotated[FiniteFloat, Field(ge=0, le=1)], Annotated[FiniteFloat, Field(ge=0, le=1)]
    ]


class AnatomyFindingInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    key: UUID
    registry_version: Literal[1] = 1
    layer: Literal["body", "skeleton"]
    structure_id: str = Field(max_length=160)
    side: Literal["left", "right", "midline", "bilateral"]
    description: str = Field(min_length=1, max_length=240)
    category: Literal["reported", "observed", "suspected", "confirmed"] = "observed"
    severity: Literal["unknown", "mild", "moderate", "severe"] = "unknown"
    status: Literal["active", "resolved", "historical", "entered_in_error"] = "active"
    notes: str = Field(default="", max_length=1000)
    terminology_system: str = Field(default="", max_length=80)
    code: str = Field(default="", max_length=80)
    source_revision_id: UUID | None = None
    anchor: Annotated[ModelAnchor | MapAnchor, Field(discriminator="kind")] | None = None

    @model_validator(mode="after")
    def location(self):
        validate_anatomy_location(
            self.registry_version, self.layer, self.structure_id, self.side, self.anchor
        )
        return self
