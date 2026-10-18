from datetime import date, datetime
from uuid import UUID

import strawberry
from pydantic import ValidationError

from config.errors import DomainError


@strawberry.input
class DemographicsFields:
    full_name: str
    date_of_birth: date | None = None
    sex: str = "not_recorded"
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relationship: str | None = None
    guardian_name: str | None = None
    guardian_phone: str | None = None
    guardian_relationship: str | None = None


@strawberry.input
class RegisterPatientInput(DemographicsFields):
    branch_id: UUID
    request_id: UUID


@strawberry.input
class UpdateDemographicsInput(DemographicsFields):
    expected_version: int


@strawberry.input
class AllergyInput:
    substance: str
    reaction: str = ""
    severity: str = "unknown"


@strawberry.input
class MedicationInput:
    name: str
    dose: str = ""
    frequency: str = ""


@strawberry.input
class SaveClinicalHistoryInput:
    expected_version: int
    medical_history: str = ""
    conditions: str = ""
    past_procedures: str = ""
    allergy_state: str = "unreviewed"
    allergies: list[AllergyInput] = strawberry.field(default_factory=list)
    medication_state: str = "unreviewed"
    medications: list[MedicationInput] = strawberry.field(default_factory=list)
    reason: str = ""


def validated(model, data):
    import dataclasses

    try:
        return model.model_validate(dataclasses.asdict(data))
    except (ValidationError, ValueError):
        raise DomainError(
            "INVALID_INPUT", "Check the patient fields and review states, then try again."
        ) from None


@strawberry.type
class PatientSummary:
    id: UUID
    reference: str
    full_name: str
    date_of_birth: date | None


@strawberry.type
class PatientDemographics(PatientSummary):
    branch_id: UUID
    sex: str
    email: str | None
    phone: str | None
    address: str | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    emergency_contact_relationship: str | None
    guardian_name: str | None
    guardian_phone: str | None
    guardian_relationship: str | None
    version: int
    created_at: datetime
    updated_at: datetime


def patient_summary(patient):
    return PatientSummary(
        id=patient.id,
        reference=patient.reference,
        full_name=patient.full_name,
        date_of_birth=patient.date_of_birth,
    )


def patient_details(patient):
    import dataclasses

    return PatientDemographics(
        **{
            field.name: getattr(patient, field.name)
            for field in dataclasses.fields(PatientDemographics)
        }
    )


@strawberry.type
class PatientPage:
    items: list[PatientSummary]
    end_cursor: UUID | None
    has_next_page: bool
    total_count: int


@strawberry.type
class Allergy:
    substance: str
    reaction: str
    severity: str


@strawberry.type
class Medication:
    name: str
    dose: str
    frequency: str


@strawberry.type
class ClinicalHistory:
    id: UUID
    version: int
    author_name: str
    created_at: datetime
    medical_history: str
    conditions: str
    past_procedures: str
    allergy_state: str
    allergies: list[Allergy]
    medication_state: str
    medications: list[Medication]
    reason: str


def clinical_details(revision):
    if revision is None:
        return None
    author = revision.author
    return ClinicalHistory(
        id=revision.id,
        version=revision.version,
        author_name=author.display_name,
        created_at=revision.created_at,
        medical_history=revision.medical_history,
        conditions=revision.conditions,
        past_procedures=revision.past_procedures,
        allergy_state=revision.allergy_state,
        allergies=[Allergy(**item) for item in revision.allergies],
        medication_state=revision.medication_state,
        medications=[Medication(**item) for item in revision.medications],
        reason=revision.reason,
    )


@strawberry.type
class ClinicalRevisionPage:
    items: list[ClinicalHistory]
    end_version: int | None
    has_next_page: bool


@strawberry.type
class PatientTimelineEvent:
    id: UUID
    action: str
    author_name: str
    created_at: datetime
    revision_id: UUID | None
    encounter_id: UUID | None = None
    encounter_revision_id: UUID | None = None


@strawberry.type
class PatientTimelinePage:
    items: list[PatientTimelineEvent]
    end_cursor: str | None
    has_next_page: bool


@strawberry.type
class PatientAssignee:
    membership_id: UUID
    display_name: str
    branch_label: str
    active: bool


def assignee_details(item):
    return PatientAssignee(
        membership_id=item.membership_id,
        display_name=item.display_name,
        branch_label=item.branch_label,
        active=item.active,
    )
