from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from medframe_apps.anatomy.inputs import AnatomyFindingInput
from medframe_apps.encounters.inputs import (
    DiagnosisInput,
    FindingInput,
    Input,
    ObservationInput,
    ProcedureInput,
    Soap,
)

Section = Literal["soap", "diagnoses", "observations", "dental", "anatomy", "procedures"]


class Selection(Input):
    organization_id: UUID
    encounter_id: UUID
    revision_id: UUID
    sections: list[Section] = Field(min_length=1, max_length=6)


class ChartFinding(FindingInput):
    encounter_id: UUID


class DentalSection(Input):
    findings: list[FindingInput] = Field(max_length=80)
    chart: list[ChartFinding] = Field(max_length=400)


class Sections(Input):
    soap: Soap | None = None
    diagnoses: list[DiagnosisInput] | None = Field(default=None, max_length=20)
    observations: list[ObservationInput] | None = Field(default=None, max_length=30)
    dental: DentalSection | None = None
    anatomy: list[AnatomyFindingInput] | None = Field(default=None, max_length=60)
    procedures: list[ProcedureInput] | None = Field(default=None, max_length=30)


class Source(Input):
    organization_id: UUID
    branch_id: UUID
    branch_name_at_finalization: str = Field(max_length=160)


class PatientIdentity(Input):
    id: UUID
    clinic_reference: str = Field(max_length=80)
    name_at_export: str = Field(max_length=240)


class RevisionIdentity(Input):
    encounter_id: UUID
    id: UUID
    version: int = Field(ge=1)
    finalized_at: datetime
    author_id: UUID
    provider_name_at_finalization: str = Field(max_length=240)
    provider_specialty_at_finalization: str = Field(max_length=80)


class ClinicalExport(Input):
    schema_version: Literal["medframe.clinical-export/1"] = "medframe.clinical-export/1"
    generated_at: datetime
    source: Source
    patient: PatientIdentity
    revision: RevisionIdentity
    sections: Sections
