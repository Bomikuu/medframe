from datetime import date, datetime
from uuid import UUID

import strawberry
from pydantic import ValidationError
from strawberry.types import Info

from app.core.database import session_factory
from app.core.errors import DomainError
from app.modules.identity.models import User
from app.modules.patients import access, demographics, history, registration, search, timeline
from app.modules.patients import schemas as inputs


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


async def clinical_details(db, revision):
    if revision is None:
        return None
    author = await db.get(User, revision.author_id)
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


def request_args(info):
    return info.context["principal"], info.context["request_context"]


@strawberry.type
class PatientQuery:
    @strawberry.field
    async def clinic_patients(
        self,
        info: Info,
        organization_id: UUID,
        query: str = "",
        first: int = 20,
        after: UUID | None = None,
    ) -> PatientPage:
        async with session_factory.begin() as db:
            page = await search.search_patients(
                db, *request_args(info), organization_id, query, first, after
            )
            return PatientPage(
                items=[patient_summary(p) for p in page.items],
                end_cursor=page.end_cursor,
                has_next_page=page.has_next_page,
                total_count=page.total_count,
            )

    @strawberry.field
    async def recent_patients(self, info: Info, organization_id: UUID) -> list[PatientSummary]:
        async with session_factory.begin() as db:
            return [
                patient_summary(p)
                for p in await search.recent_patients(db, *request_args(info), organization_id)
            ]

    @strawberry.field
    async def patient_demographics(
        self, info: Info, organization_id: UUID, patient_id: UUID
    ) -> PatientDemographics:
        async with session_factory.begin() as db:
            return patient_details(
                await demographics.get_demographics(
                    db, *request_args(info), organization_id, patient_id
                )
            )

    @strawberry.field
    async def patient_clinical_history(
        self, info: Info, organization_id: UUID, patient_id: UUID
    ) -> ClinicalHistory | None:
        async with session_factory.begin() as db:
            return await clinical_details(
                db,
                await history.read_clinical_history(
                    db, *request_args(info), organization_id, patient_id
                ),
            )

    @strawberry.field
    async def patient_clinical_revisions(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        first: int = 20,
        after_version: int | None = None,
    ) -> ClinicalRevisionPage:
        async with session_factory.begin() as db:
            items, more = await history.list_clinical_revisions(
                db, *request_args(info), organization_id, patient_id, first, after_version
            )
            return ClinicalRevisionPage(
                items=[await clinical_details(db, item) for item in items],
                end_version=items[-1].version if items else None,
                has_next_page=more,
            )

    @strawberry.field
    async def patient_timeline(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        first: int = 20,
        after: str | None = None,
    ) -> PatientTimelinePage:
        async with session_factory.begin() as db:
            page = await timeline.list_patient_events(
                db, *request_args(info), organization_id, patient_id, first, after
            )
            items = []
            for event in page.items:
                user = await db.get(User, event.actor_id)
                items.append(
                    PatientTimelineEvent(
                        id=event.id,
                        action=event.action,
                        author_name=user.display_name,
                        created_at=event.created_at,
                        revision_id=event.revision_id,
                    )
                )
            return PatientTimelinePage(
                items=items, end_cursor=page.end_cursor, has_next_page=page.has_next_page
            )

    @strawberry.field
    async def patient_access_grants(
        self, info: Info, organization_id: UUID, patient_id: UUID
    ) -> list[PatientAssignee]:
        async with session_factory.begin() as db:
            return [
                assignee_details(item)
                for item in await access.list_patient_grants(
                    db, *request_args(info), organization_id, patient_id
                )
            ]

    @strawberry.field
    async def eligible_patient_assignees(
        self, info: Info, organization_id: UUID, patient_id: UUID, query: str = "", first: int = 20
    ) -> list[PatientAssignee]:
        async with session_factory.begin() as db:
            return [
                assignee_details(item)
                for item in await access.list_eligible_assignees(
                    db, *request_args(info), organization_id, patient_id, query, first
                )
            ]


@strawberry.type
class PatientMutation:
    @strawberry.mutation
    async def register_patient(
        self, info: Info, organization_id: UUID, data: RegisterPatientInput
    ) -> PatientDemographics:
        validated_input = validated(inputs.RegisterPatientInput, data)
        async with session_factory.begin() as db:
            return patient_details(
                await registration.register_patient(
                    db, *request_args(info), organization_id, validated_input
                )
            )

    @strawberry.mutation
    async def update_patient_demographics(
        self, info: Info, organization_id: UUID, patient_id: UUID, data: UpdateDemographicsInput
    ) -> PatientDemographics:
        validated_input = validated(inputs.UpdateDemographicsInput, data)
        async with session_factory.begin() as db:
            return patient_details(
                await demographics.update_demographics(
                    db, *request_args(info), organization_id, patient_id, validated_input
                )
            )

    @strawberry.mutation
    async def save_patient_clinical_history(
        self, info: Info, organization_id: UUID, patient_id: UUID, data: SaveClinicalHistoryInput
    ) -> ClinicalHistory:
        validated_input = validated(inputs.SaveClinicalHistoryInput, data)
        async with session_factory.begin() as db:
            return await clinical_details(
                db,
                await history.save_clinical_history(
                    db, *request_args(info), organization_id, patient_id, validated_input
                ),
            )

    @strawberry.mutation
    async def set_patient_access(
        self, info: Info, organization_id: UUID, patient_id: UUID, membership_id: UUID, active: bool
    ) -> PatientAssignee:
        async with session_factory.begin() as db:
            return assignee_details(
                await access.set_patient_access(
                    db, *request_args(info), organization_id, patient_id, membership_id, active
                )
            )
