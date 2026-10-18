from app.core.database import utcnow
from app.core.errors import DomainError
from app.modules.audit.service import append_event
from app.modules.organizations.models import Organization
from app.modules.patients.events import record_event
from app.modules.patients.policy import require_patient
from app.modules.patients.validation import validate_birth_date


async def get_demographics(db, principal, context, organization_id, patient_id):
    patient = await require_patient(
        db, principal, organization_id, patient_id, "patients.demographics.read"
    )
    await append_event(db, principal, context, "patient.read", organization_id, patient.id)
    return patient


async def update_demographics(db, principal, context, organization_id, patient_id, data):
    patient = await require_patient(
        db, principal, organization_id, patient_id, "patients.demographics.write", lock=True
    )
    if patient.version != data.expected_version:
        raise DomainError(
            "CONFLICT", "Patient details changed. Review the latest version before saving.", 409
        )
    validate_birth_date(data, await db.get(Organization, organization_id))
    for field, value in data.model_dump(exclude={"expected_version"}).items():
        setattr(patient, field, value)
    patient.version += 1
    patient.updated_at = utcnow()
    await record_event(db, principal, context, patient, "demographics.updated")
    return patient
