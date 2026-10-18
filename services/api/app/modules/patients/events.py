from app.modules.audit.service import append_event
from app.modules.patients.models import PatientEvent


async def record_event(
    db, principal, context, patient, action, revision_id=None, target_membership_id=None
):
    db.add(
        PatientEvent(
            organization_id=patient.organization_id,
            patient_id=patient.id,
            actor_id=principal.user_id,
            action=action,
            revision_id=revision_id,
            target_membership_id=target_membership_id,
        )
    )
    await append_event(
        db, principal, context, "patient." + action, patient.organization_id, patient.id
    )
