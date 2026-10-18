import base64
import hashlib
import secrets

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.core.errors import DomainError
from app.modules.organizations.models import Branch, Organization
from app.modules.patients.events import record_event
from app.modules.patients.models import Patient, PatientAccessGrant, PatientRegistrationRequest
from app.modules.patients.policy import (
    effective_permissions,
    require_patient,
    resolve_patient_scope,
)
from app.modules.patients.validation import validate_birth_date


async def register_patient(db, principal, context, organization_id, data):
    scope = await resolve_patient_scope(db, principal, organization_id, "patients.register")
    branch = await db.scalar(
        select(Branch).where(Branch.id == data.branch_id, Branch.organization_id == organization_id)
    )
    if not branch or (scope.branch_id and scope.branch_id != branch.id):
        raise DomainError("FORBIDDEN", "Choose an authorized branch.", 403)
    organization = await db.get(Organization, organization_id)
    validate_birth_date(data, organization)
    digest = hashlib.sha256(data.model_dump_json().encode()).hexdigest()
    # A transaction-scoped advisory lock serializes a new key before its row exists.
    key = f"{organization_id}:{principal.user_id}:{data.request_id}"
    await db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"), {"key": key})
    previous = await db.scalar(
        select(PatientRegistrationRequest).where(
            PatientRegistrationRequest.organization_id == organization_id,
            PatientRegistrationRequest.actor_id == principal.user_id,
            PatientRegistrationRequest.request_id == data.request_id,
        )
    )
    if previous:
        if previous.input_digest != digest:
            raise DomainError(
                "CONFLICT", "This registration was already submitted with different details.", 409
            )
        return await require_patient(
            db, principal, organization_id, previous.patient_id, "patients.demographics.read"
        )
    values = data.model_dump(exclude={"branch_id", "request_id"})
    for attempt in range(3):
        reference = "MFP-" + base64.b32encode(secrets.token_bytes(8)).decode()[:12]
        try:
            async with db.begin_nested():
                patient = Patient(
                    organization_id=organization_id,
                    branch_id=branch.id,
                    registered_by=principal.user_id,
                    reference=reference,
                    **values,
                )
                db.add(patient)
                await db.flush()
            break
        except IntegrityError:
            if attempt == 2:
                raise DomainError(
                    "UNAVAILABLE", "Registration could not be saved. Retry with the same form.", 503
                ) from None
    permissions = await effective_permissions(db, scope.membership_id)
    if "patients.clinical.write" in permissions:
        db.add(
            PatientAccessGrant(
                organization_id=organization_id,
                patient_id=patient.id,
                membership_id=scope.membership_id,
                granted_by=principal.user_id,
            )
        )
    db.add(
        PatientRegistrationRequest(
            organization_id=organization_id,
            actor_id=principal.user_id,
            request_id=data.request_id,
            patient_id=patient.id,
            input_digest=digest,
        )
    )
    await record_event(db, principal, context, patient, "registered")
    return patient
