from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, model_validator

from medframe_apps.anatomy.inputs import AnatomyFindingInput
from medframe_apps.dental.reference import validate_tooth_surfaces


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Soap(Input):
    subjective: str = Field(default="", max_length=6000)
    objective: str = Field(default="", max_length=6000)
    assessment: str = Field(default="", max_length=6000)
    plan: str = Field(default="", max_length=6000)


class DiagnosisInput(Input):
    description: str = Field(min_length=1, max_length=240)
    certainty: Literal["reported", "observed", "suspected", "confirmed", "resolved"]
    code: str = Field(default="", max_length=40)


class ObservationInput(Input):
    label: str = Field(min_length=1, max_length=120)
    value: str = Field(min_length=1, max_length=240)
    source: Literal["reported", "observed"] = "observed"


PointCoordinate = Annotated[FiniteFloat, Field(ge=-100000, le=100000)]


class DentalAnchorInput(Input):
    asset: Literal["dundee-permanent-v1", "dundee-molar26-v1"]
    point: tuple[PointCoordinate, PointCoordinate, PointCoordinate]


class FindingInput(Input):
    key: UUID
    tooth: str
    surfaces: list[str] = Field(default_factory=list, max_length=5)
    condition: str = Field(min_length=1, max_length=120)
    severity: Literal["unknown", "mild", "moderate", "severe"] = "unknown"
    status: Literal["active", "resolved", "historical"] = "active"
    notes: str = Field(default="", max_length=500)
    anchor: DentalAnchorInput | None = None

    @model_validator(mode="after")
    def valid_surfaces(self):
        validate_tooth_surfaces(self.tooth, self.surfaces)
        if self.anchor:
            if self.tooth[0] not in "1234":
                raise ValueError("Anatomical pins require a permanent tooth")
            if self.anchor.asset == "dundee-molar26-v1" and self.tooth != "26":
                raise ValueError("The detailed molar asset represents tooth 26")
        return self


ProcedureStatus = Literal["proposed", "planned", "in_progress", "completed", "cancelled"]


class ProcedureInput(Input):
    description: str = Field(min_length=1, max_length=240)
    status: ProcedureStatus = "proposed"
    tooth: str = ""
    surfaces: list[str] = Field(default_factory=list, max_length=5)
    notes: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def valid_surfaces(self):
        if self.tooth or self.surfaces:
            validate_tooth_surfaces(self.tooth, self.surfaces)
        return self


class DraftInput(Input):
    soap: Soap = Field(default_factory=Soap)
    diagnoses: list[DiagnosisInput] = Field(default_factory=list, max_length=20)
    observations: list[ObservationInput] = Field(default_factory=list, max_length=30)
    anatomy_findings: list[AnatomyFindingInput] = Field(default_factory=list, max_length=60)
    findings: list[FindingInput] = Field(default_factory=list, max_length=80)
    procedures: list[ProcedureInput] = Field(default_factory=list, max_length=30)
    document_ids: list[UUID] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def bounded(self):
        if len(self.model_dump_json().encode()) > 49152:
            raise ValueError("Combined draft must fit 48KiB")
        if len({finding.key for finding in self.findings}) != len(self.findings):
            raise ValueError("Finding keys must be unique")
        if len({item.key for item in self.anatomy_findings}) != len(self.anatomy_findings):
            raise ValueError("Anatomy finding keys must be unique")
        if len(set(self.document_ids)) != len(self.document_ids):
            raise ValueError("Document versions must be unique")
        return self


class PlanItemInput(Input):
    description: str = Field(min_length=1, max_length=240)
    tooth: str = ""
    status: ProcedureStatus = "proposed"

    @model_validator(mode="after")
    def valid_tooth(self):
        if self.tooth:
            validate_tooth_surfaces(self.tooth, [])
        if self.status == "completed":
            raise ValueError("Completion requires finalized encounter evidence")
        return self


class PlanInput(Input):
    title: str = Field(min_length=1, max_length=240)
    items: Annotated[list[PlanItemInput], Field(min_length=1, max_length=30)]
