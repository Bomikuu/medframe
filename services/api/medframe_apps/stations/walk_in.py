"""Commit provisional care and a real patient identity in one native transaction."""

import hashlib

from django.db import transaction
from pydantic import ValidationError

from config.errors import DomainError
from medframe_apps.common import advisory_lock
from medframe_apps.encounters.services import (
    create_encounter,
    require_encounter,
    save_encounter_draft,
    validated_draft,
)
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.services import register_patient
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.stations.inputs import WalkInInput
from medframe_apps.stations.models import WalkInCommit
from medframe_apps.stations.policy import clinician_device, event


@transaction.atomic
def commit(request, raw):
    try:
        data = WalkInInput.model_validate(raw)
    except ValidationError:
        raise DomainError(
            "INVALID_INPUT", "Check patient details, reason and clinical content."
        ) from None
    if bool(data.patient_id) == bool(data.new_patient):
        raise DomainError(
            "INVALID_INPUT", "Choose an existing patient or enter new patient details."
        )
    clinician_device(request, data.organization_id, data.branch_id, write=True)
    content = validated_draft(data.content)
    if content["document_ids"]:
        raise DomainError("INVALID_INPUT", "Link the patient before attaching documents.")
    fingerprint = hashlib.sha256(data.model_dump_json().encode()).hexdigest()
    advisory_lock(f"station-walk-in:{data.organization_id}:{request.user.id}:{data.request_id}")
    prior = WalkInCommit.objects.filter(
        organization_id=data.organization_id,
        actor=request.user,
        request_id=data.request_id,
    ).first()
    if prior:
        if prior.input_digest != fingerprint:
            raise DomainError(
                "CONFLICT", "This draft was already saved with different details.", 409
            )
        encounter = require_encounter(request.user, data.organization_id, prior.encounter_id)
        return {"encounter_id": str(encounter.id), "patient_id": str(encounter.patient_id)}
    provider = ProviderProfile.objects.filter(
        membership__user=request.user,
        membership__organization_id=data.organization_id,
        membership__active=True,
    ).first()
    if not provider:
        raise DomainError("PROVIDER_REQUIRED", "Your active provider profile is required.", 403)
    patient_id = data.patient_id
    if data.new_patient:
        try:
            registration = RegisterPatientInput.model_validate(
                {
                    **data.new_patient,
                    "branch_id": data.branch_id,
                    "request_id": data.request_id,
                }
            )
        except ValidationError:
            raise DomainError(
                "INVALID_INPUT", "Check the new patient's name and demographics."
            ) from None
        patient_id = register_patient(request.user, data.organization_id, registration).id
    encounter = create_encounter(
        request.user,
        data.organization_id,
        patient_id,
        provider.id,
        data.branch_id,
        data.reason,
        data.request_id,
    )
    encounter = save_encounter_draft(
        request.user,
        data.organization_id,
        encounter.id,
        content,
        encounter.version,
    )
    WalkInCommit.objects.create(
        organization_id=data.organization_id,
        actor=request.user,
        request_id=data.request_id,
        input_digest=fingerprint,
        encounter=encounter,
    )
    event(request.user, data.organization_id, "walk_in.linked", encounter=encounter)
    return {"encounter_id": str(encounter.id), "patient_id": str(encounter.patient_id)}
