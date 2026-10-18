import asyncio
from datetime import date, timedelta
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select, update

from app.core.database import session_factory
from app.core.errors import DomainError
from app.core.request_context import RequestContext
from app.modules.identity.models import User
from app.modules.identity.provision import provision_staff
from app.modules.identity.schemas import Principal
from app.modules.organizations.models import Membership
from app.modules.patients.access import set_patient_access
from app.modules.patients.demographics import get_demographics, update_demographics
from app.modules.patients.history import read_clinical_history, save_clinical_history
from app.modules.patients.models import (
    Patient,
    PatientAccessGrant,
    PatientClinicalRevision,
)
from app.modules.patients.registration import register_patient
from app.modules.patients.schemas import (
    RegisterPatientInput,
    SaveClinicalHistoryInput,
    UpdateDemographicsInput,
)
from app.modules.patients.search import search_patients
from app.modules.patients.timeline import list_patient_events

context = RequestContext("patients-test", "127.0.0.1", "http://localhost:3000")


async def actors():
    result = {}
    for role in ["dentist", "doctor", "clinic_administrator", "receptionist"]:
        await provision_staff(
            f"{role}@example.org", role, "Synthetic Clinic", "Main", role, "synthetic-password-1234"
        )
        async with session_factory() as db:
            user = await db.scalar(select(User).where(User.email == f"{role}@example.org"))
            member = await db.scalar(select(Membership).where(Membership.user_id == user.id))
            result[role] = (Principal(user.id, uuid4()), member)
    return result


async def register(actor, name="李 María Dela Cruz", request_id=None):
    principal, member = actor
    data = RegisterPatientInput(
        full_name=name,
        branch_id=member.branch_id,
        request_id=request_id or uuid4(),
        date_of_birth=date(2001, 2, 3),
    )
    async with session_factory.begin() as db:
        return await register_patient(db, principal, context, member.organization_id, data)


async def test_registration_retries_and_authorized_search():
    people = await actors()
    actor = people["dentist"]
    key = uuid4()
    outcomes = await asyncio.gather(
        register(actor, request_id=key), register(actor, request_id=key)
    )
    assert outcomes[0].id == outcomes[1].id
    async with session_factory.begin() as db:
        assert await db.scalar(select(func.count()).select_from(Patient)) == 1
        assert await db.scalar(select(func.count()).select_from(PatientAccessGrant)) == 1
        for role, expected in [
            ("dentist", 1),
            ("doctor", 0),
            ("clinic_administrator", 1),
            ("receptionist", 1),
        ]:
            principal, member = people[role]
            page = await search_patients(db, principal, context, member.organization_id, "María")
            assert page.total_count == expected
            assert len(page.items) == expected
        page = await search_patients(db, actor[0], context, actor[1].organization_id, "%")
        assert page.total_count == 0
        with pytest.raises(DomainError) as error:
            await get_demographics(
                db, people["doctor"][0], context, actor[1].organization_id, outcomes[0].id
            )
        assert error.value.code == "NOT_FOUND"
    with pytest.raises(DomainError) as error:
        await register(actor, name="Different", request_id=key)
    assert error.value.code == "CONFLICT"


async def test_clinical_versions_states_and_no_admin_bypass():
    people = await actors()
    principal, member = people["dentist"]
    patient = await register(people["dentist"])
    async with session_factory.begin() as db:
        assert (
            await read_clinical_history(db, principal, context, member.organization_id, patient.id)
            is None
        )
        revision = await save_clinical_history(
            db,
            principal,
            context,
            member.organization_id,
            patient.id,
            SaveClinicalHistoryInput(
                expected_version=0, allergy_state="none_reported", medication_state="none_reported"
            ),
        )
        assert revision.version == 1
    for role in ["doctor", "clinic_administrator", "receptionist"]:
        async with session_factory.begin() as db:
            with pytest.raises(DomainError):
                await read_clinical_history(
                    db, people[role][0], context, member.organization_id, patient.id
                )
    with pytest.raises(ValidationError):
        SaveClinicalHistoryInput(expected_version=0, allergy_state="recorded")
    with pytest.raises(ValidationError):
        SaveClinicalHistoryInput(expected_version=0, allergies=[{"substance": "test"}])

    async def save(text):
        try:
            async with session_factory.begin() as db:
                return await save_clinical_history(
                    db,
                    principal,
                    context,
                    member.organization_id,
                    patient.id,
                    SaveClinicalHistoryInput(expected_version=1, medical_history=text),
                )
        except DomainError as error:
            return error.code

    results = await asyncio.gather(save("first"), save("second"))
    assert sum(isinstance(r, PatientClinicalRevision) for r in results) == 1
    assert "CONFLICT" in results
    async with session_factory() as db:
        assert await db.scalar(select(func.count()).select_from(PatientClinicalRevision)) == 2
    with pytest.raises(Exception, match="append-only"):
        async with session_factory.begin() as db:
            await db.execute(update(PatientClinicalRevision).values(medical_history="overwrite"))
    async with session_factory.begin() as db:
        events = await list_patient_events(
            db, people["clinic_administrator"][0], context, member.organization_id, patient.id
        )
        assert all(event.action != "clinical.updated" for event in events.items)


async def test_explicit_grant_revocation_and_demographic_conflict():
    people = await actors()
    admin, member = people["clinic_administrator"]
    doctor, doctor_member = people["doctor"]
    patient = await register(people["receptionist"])
    async with session_factory.begin() as db:
        await set_patient_access(
            db, admin, context, member.organization_id, patient.id, doctor_member.id, True
        )
    async with session_factory.begin() as db:
        assert await get_demographics(db, doctor, context, member.organization_id, patient.id)
        updated = await update_demographics(
            db,
            admin,
            context,
            member.organization_id,
            patient.id,
            UpdateDemographicsInput(full_name="Updated patient", expected_version=1),
        )
        assert updated.version == 2
    async with session_factory.begin() as db:
        with pytest.raises(DomainError) as error:
            await update_demographics(
                db,
                admin,
                context,
                member.organization_id,
                patient.id,
                UpdateDemographicsInput(full_name="Stale update", expected_version=1),
            )
        assert error.value.code == "CONFLICT"
        await set_patient_access(
            db, admin, context, member.organization_id, patient.id, doctor_member.id, False
        )
    async with session_factory.begin() as db:
        with pytest.raises(DomainError):
            await get_demographics(db, doctor, context, member.organization_id, patient.id)
        assert (await search_patients(db, doctor, context, member.organization_id)).total_count == 0
    async with session_factory.begin() as db:
        await db.execute(update(Membership).where(Membership.id == member.id).values(active=False))
    async with session_factory.begin() as db:
        with pytest.raises(DomainError):
            await get_demographics(db, admin, context, member.organization_id, patient.id)


async def test_future_birth_date_and_atomic_failure():
    people = await actors()
    actor, member = people["dentist"]
    with pytest.raises(DomainError):
        async with session_factory.begin() as db:
            await register_patient(
                db,
                actor,
                context,
                member.organization_id,
                RegisterPatientInput(
                    full_name="Test",
                    branch_id=member.branch_id,
                    request_id=uuid4(),
                    date_of_birth=date.today() + timedelta(days=2),
                ),
            )
    async with session_factory() as db:
        assert await db.scalar(select(func.count()).select_from(Patient)) == 0
