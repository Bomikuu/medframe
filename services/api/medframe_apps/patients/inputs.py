from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Name = Annotated[str, Field(min_length=1, max_length=160)]
OptionalName = Annotated[str | None, Field(max_length=160)]
Phone = Annotated[str | None, Field(max_length=40)]
ReviewState = Literal["unreviewed", "none_reported", "recorded"]


class DemographicsInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    full_name: Name
    date_of_birth: date | None = None
    sex: Literal["female", "male", "intersex", "not_recorded"] = "not_recorded"
    email: Annotated[str | None, Field(max_length=254)] = None
    phone: Phone = None
    address: Annotated[str | None, Field(max_length=500)] = None
    emergency_contact_name: OptionalName = None
    emergency_contact_phone: Phone = None
    emergency_contact_relationship: OptionalName = None
    guardian_name: OptionalName = None
    guardian_phone: Phone = None
    guardian_relationship: OptionalName = None

    @field_validator("*", mode="before")
    @classmethod
    def empty_to_null(cls, value, info):
        if (
            isinstance(value, str)
            and not value.strip()
            and info.field_name not in {"full_name", "sex"}
        ):
            return None
        return value

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        if value:
            from email_validator import validate_email

            return validate_email(value, check_deliverability=False).normalized
        return value


class RegisterPatientInput(DemographicsInput):
    branch_id: UUID
    request_id: UUID


class UpdateDemographicsInput(DemographicsInput):
    expected_version: Annotated[int, Field(ge=1)]


class AllergyInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    substance: Annotated[str, Field(min_length=1, max_length=120)]
    reaction: Annotated[str, Field(max_length=240)] = ""
    severity: Literal["unknown", "mild", "moderate", "severe"] = "unknown"


class MedicationInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: Annotated[str, Field(min_length=1, max_length=120)]
    dose: Annotated[str, Field(max_length=80)] = ""
    frequency: Annotated[str, Field(max_length=80)] = ""


class SaveClinicalHistoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    expected_version: Annotated[int, Field(ge=0)]
    medical_history: Annotated[str, Field(max_length=2000)] = ""
    conditions: Annotated[str, Field(max_length=2000)] = ""
    past_procedures: Annotated[str, Field(max_length=2000)] = ""
    allergy_state: ReviewState = "unreviewed"
    allergies: Annotated[list[AllergyInput], Field(max_length=20)] = Field(default_factory=list)
    medication_state: ReviewState = "unreviewed"
    medications: Annotated[list[MedicationInput], Field(max_length=20)] = Field(
        default_factory=list
    )
    reason: Annotated[str, Field(max_length=240)] = ""

    @model_validator(mode="after")
    def consistent_states(self):
        for state, items in [
            (self.allergy_state, self.allergies),
            (self.medication_state, self.medications),
        ]:
            if (state == "recorded") != bool(items):
                raise ValueError(
                    "Recorded states require items; other states require an empty list."
                )
        if len(self.model_dump_json().encode("utf-8")) > 12000:
            raise ValueError("Medical history exceeds the combined size limit.")
        return self
