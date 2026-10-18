from sqlalchemy import select

from app.core.errors import DomainError
from app.modules.audit.service import append_event
from app.modules.patients.events import record_event
from app.modules.patients.models import PatientClinicalRevision
from app.modules.patients.policy import require_patient
from app.modules.patients.search import check_page


def latest_revision(patient_id):
    return (
        select(PatientClinicalRevision)
        .where(PatientClinicalRevision.patient_id == patient_id)
        .order_by(PatientClinicalRevision.version.desc())
    )


async def read_clinical_history(db, principal, context, organization_id, patient_id):
    await require_patient(db, principal, organization_id, patient_id, "patients.clinical.read")
    revision = await db.scalar(latest_revision(patient_id).limit(1))
    await append_event(db, principal, context, "patient.clinical.read", organization_id, patient_id)
    return revision


async def save_clinical_history(db, principal, context, organization_id, patient_id, data):
    patient = await require_patient(
        db, principal, organization_id, patient_id, "patients.clinical.write", lock=True
    )
    latest = await db.scalar(latest_revision(patient_id).limit(1))
    version = latest.version if latest else 0
    if version != data.expected_version:
        raise DomainError(
            "CONFLICT", "Medical history changed. Review the latest version before saving.", 409
        )
    revision = PatientClinicalRevision(
        organization_id=organization_id,
        patient_id=patient_id,
        version=version + 1,
        author_id=principal.user_id,
        **data.model_dump(exclude={"expected_version"}),
    )
    db.add(revision)
    await db.flush()
    await record_event(db, principal, context, patient, "clinical.updated", revision.id)
    return revision


async def list_clinical_revisions(
    db, principal, context, organization_id, patient_id, first=20, after_version=None
):
    check_page(first)
    await require_patient(db, principal, organization_id, patient_id, "patients.clinical.read")
    query = latest_revision(patient_id)
    if after_version is not None:
        if after_version < 1:
            raise DomainError("INVALID_INPUT", "Use a valid revision cursor.")
        query = query.where(PatientClinicalRevision.version < after_version)
    rows = list(await db.scalars(query.limit(first + 1)))
    await append_event(
        db, principal, context, "patient.revisions.read", organization_id, patient_id
    )
    return rows[:first], len(rows) > first
