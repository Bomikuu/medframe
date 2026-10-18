import asyncio
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select, text, update
from test_patients_workflow import actors, context, register

from app.core.database import session_factory
from app.core.errors import DomainError
from app.modules.audit.models import AuditEvent
from app.modules.identity.provision import provision_staff
from app.modules.organizations.models import Branch, Membership, MembershipRole
from app.modules.patients import events
from app.modules.patients.access import list_eligible_assignees, set_patient_access
from app.modules.patients.demographics import get_demographics
from app.modules.patients.history import save_clinical_history
from app.modules.patients.models import Patient, PatientClinicalRevision, PatientEvent
from app.modules.patients.schemas import SaveClinicalHistoryInput
from app.modules.patients.search import recent_patients, search_patients
from app.modules.patients.timeline import list_patient_events


async def test_branch_and_foreign_clinic_scope_precedes_counts_and_reads():
    people = await actors()
    principal, member = people["dentist"]
    patient = await register(people["dentist"])
    async with session_factory.begin() as db:
        branch = Branch(organization_id=member.organization_id, name="Other branch")
        db.add(branch)
        await db.flush()
        await db.execute(
            update(Membership).where(Membership.id == member.id).values(branch_id=branch.id)
        )
    async with session_factory.begin() as db:
        assert (
            await search_patients(db, principal, context, member.organization_id)
        ).total_count == 0
        with pytest.raises(DomainError) as missing:
            await get_demographics(db, principal, context, member.organization_id, patient.id)
        with pytest.raises(DomainError) as unknown:
            await get_demographics(db, principal, context, member.organization_id, uuid4())
        assert (missing.value.code, missing.value.message) == (
            unknown.value.code,
            unknown.value.message,
        )
    await provision_staff(
        "dentist@example.org", "dentist", "Foreign synthetic clinic", "Main", "dentist", None
    )
    async with session_factory.begin() as db:
        foreign = await db.scalar(
            select(Membership).where(
                Membership.user_id == principal.user_id,
                Membership.organization_id != member.organization_id,
            )
        )
        assert (
            await search_patients(db, principal, context, foreign.organization_id)
        ).total_count == 0
        with pytest.raises(DomainError):
            await get_demographics(db, principal, context, foreign.organization_id, patient.id)


async def test_role_removal_revokes_existing_grant_and_recent_patient():
    people = await actors()
    principal, member = people["dentist"]
    patient = await register(people["dentist"])
    async with session_factory.begin() as db:
        await get_demographics(db, principal, context, member.organization_id, patient.id)
        assert len(await recent_patients(db, principal, context, member.organization_id)) == 1
        await db.execute(delete(MembershipRole).where(MembershipRole.membership_id == member.id))
        db.add(MembershipRole(membership_id=member.id, role="platform_administrator"))
    async with session_factory.begin() as db:
        with pytest.raises(DomainError):
            await get_demographics(db, principal, context, member.organization_id, patient.id)


async def test_grant_ineligible_assignee_and_revocation_attribution():
    people = await actors()
    admin, member = people["clinic_administrator"]
    patient = await register(people["receptionist"])
    async with session_factory.begin() as db:
        assignees = await list_eligible_assignees(
            db, admin, context, member.organization_id, patient.id
        )
        assert {item.membership_id for item in assignees} == {
            people["dentist"][1].id,
            people["doctor"][1].id,
        }
        with pytest.raises(DomainError):
            await set_patient_access(
                db,
                admin,
                context,
                member.organization_id,
                patient.id,
                people["receptionist"][1].id,
                True,
            )
        await set_patient_access(
            db, admin, context, member.organization_id, patient.id, people["doctor"][1].id, True
        )
        await set_patient_access(
            db, admin, context, member.organization_id, patient.id, people["doctor"][1].id, False
        )
        event = await db.scalar(select(PatientEvent).where(PatientEvent.action == "access.revoked"))
        assert event.target_membership_id == people["doctor"][1].id
        assert event.actor_id == admin.user_id


async def test_audit_failure_rolls_back_registration_and_clinical_revision(monkeypatch):
    people = await actors()
    principal, member = people["dentist"]
    patient = await register(people["dentist"])

    async def fail(*args, **kwargs):
        raise RuntimeError("Synthetic audit unavailable")

    monkeypatch.setattr(events, "append_event", fail)
    with pytest.raises(RuntimeError):
        await register(people["dentist"], "Rolled back patient")
    with pytest.raises(RuntimeError):
        async with session_factory.begin() as db:
            await save_clinical_history(
                db,
                principal,
                context,
                member.organization_id,
                patient.id,
                SaveClinicalHistoryInput(expected_version=0, medical_history="rolled back"),
            )
    async with session_factory() as db:
        assert await db.scalar(select(func.count()).select_from(Patient)) == 1
        assert await db.scalar(select(func.count()).select_from(PatientClinicalRevision)) == 0
        assert await db.scalar(select(func.count()).select_from(PatientEvent)) == 1


async def test_pagination_and_timeline_cursor_do_not_leak_clinical_events():
    people = await actors()
    principal, member = people["dentist"]
    patients = [
        await register(people["dentist"], f"Synthetic patient {index}") for index in range(3)
    ]
    async with session_factory.begin() as db:
        first = await search_patients(db, principal, context, member.organization_id, first=2)
        second = await search_patients(
            db, principal, context, member.organization_id, first=2, after=first.end_cursor
        )
        assert first.has_next_page and not second.has_next_page
        assert first.total_count == second.total_count == 3
        assert {p.id for p in first.items}.isdisjoint({p.id for p in second.items})
        for count in (0, 51):
            with pytest.raises(DomainError):
                await search_patients(db, principal, context, member.organization_id, first=count)
        for version in range(2):
            await save_clinical_history(
                db,
                principal,
                context,
                member.organization_id,
                patients[0].id,
                SaveClinicalHistoryInput(expected_version=version),
            )
        timeline = await list_patient_events(
            db, principal, context, member.organization_id, patients[0].id, first=1
        )
        older = await list_patient_events(
            db,
            principal,
            context,
            member.organization_id,
            patients[0].id,
            first=1,
            after=timeline.end_cursor,
        )
        assert timeline.items[0].id != older.items[0].id
        with pytest.raises(DomainError):
            await list_patient_events(
                db, principal, context, member.organization_id, patients[0].id, after="malformed"
            )
        admin_events = await list_patient_events(
            db, people["clinic_administrator"][0], context, member.organization_id, patients[0].id
        )
        assert [event.action for event in admin_events.items] == ["registered"]


async def test_revocation_wins_against_a_waiting_clinical_write():
    people = await actors()
    principal, member = people["dentist"]
    admin = people["clinic_administrator"][0]
    patient = await register(people["dentist"])
    waiter_started = asyncio.Event()

    async def write():
        async with session_factory.begin() as db:
            pid = await db.scalar(text("SELECT pg_backend_pid()"))
            waiter_started.pid = pid
            waiter_started.set()
            with pytest.raises(DomainError) as denied:
                await save_clinical_history(
                    db,
                    principal,
                    context,
                    member.organization_id,
                    patient.id,
                    SaveClinicalHistoryInput(expected_version=0),
                )
            assert denied.value.code == "NOT_FOUND"

    async with session_factory.begin() as db:
        await set_patient_access(
            db, admin, context, member.organization_id, patient.id, member.id, False
        )
        task = asyncio.create_task(write())
        await waiter_started.wait()
        for _ in range(100):
            waiting = await db.scalar(
                text("SELECT wait_event_type = 'Lock' FROM pg_stat_activity WHERE pid = :pid"),
                {"pid": waiter_started.pid},
            )
            if waiting:
                break
            await asyncio.sleep(0.01)
        assert waiting, "Clinical writer must be waiting on the patient lock"
    await asyncio.wait_for(task, 5)
    async with session_factory() as db:
        assert await db.scalar(select(func.count()).select_from(PatientClinicalRevision)) == 0


async def test_recent_patients_has_a_standalone_read_audit():
    people = await actors()
    principal, member = people["dentist"]
    patient = await register(people["dentist"])
    async with session_factory.begin() as db:
        await get_demographics(db, principal, context, member.organization_id, patient.id)
        before = await db.scalar(
            select(func.count())
            .select_from(AuditEvent)
            .where(AuditEvent.action == "patient.recent.read")
        )
        result = await recent_patients(db, principal, context, member.organization_id)
        assert result[0].id == patient.id
        after = await db.scalar(
            select(func.count())
            .select_from(AuditEvent)
            .where(AuditEvent.action == "patient.recent.read")
        )
        assert after == before + 1
