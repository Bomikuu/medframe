from datetime import date
from typing import Literal
from uuid import UUID

from django.db import transaction
from pydantic import Field, ValidationError

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version
from medframe_apps.encounters.inputs import Input
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.services import require_patient
from medframe_apps.treatments.models import FollowUp, FollowUpRevision, TreatmentPlan


class FollowUpInput(Input):
    id: UUID | None = None
    plan_id: UUID | None = None
    instructions: str = Field(min_length=1, max_length=4000)
    due_date: date | None = None
    status: Literal["open", "completed", "cancelled"] = "open"


def follow_up_snapshot(item):
    return {
        "id": str(item.id),
        "plan_id": str(item.plan_id) if item.plan_id else None,
        "instructions": item.instructions,
        "due_date": item.due_date.isoformat() if item.due_date else None,
        "status": item.status,
        "version": item.version,
    }


@transaction.atomic
def save_follow_up(user, organization_id, patient_id, data, expected_version, request_id):
    require_membership(user, organization_id, "treatments.write")
    require_patient(user, organization_id, patient_id, "patients.clinical.write", lock=True)
    try:
        parsed = FollowUpInput.model_validate(data)
    except ValidationError:
        raise DomainError(
            "INVALID_INPUT", "Enter follow-up instructions up to 4,000 characters and a valid date."
        ) from None
    request_data = {
        "patient": str(patient_id),
        "data": parsed.model_dump(mode="json"),
        "version": expected_version,
    }
    previous = replay_request(user, organization_id, "follow_up.save", request_id, request_data)
    if previous:
        return FollowUp.objects.get(
            id=previous, organization_id=organization_id, patient_id=patient_id
        )
    if (
        parsed.plan_id
        and not TreatmentPlan.objects.filter(
            id=parsed.plan_id, organization_id=organization_id, patient_id=patient_id
        ).exists()
    ):
        raise DomainError("NOT_FOUND", "Treatment plan is unavailable.", 404)
    values = parsed.model_dump(exclude={"id"})
    if parsed.id:
        item = (
            FollowUp.objects.select_for_update()
            .filter(id=parsed.id, organization_id=organization_id, patient_id=patient_id)
            .first()
        )
        if item is None:
            raise DomainError("NOT_FOUND", "Follow-up is unavailable.", 404)
        check_version(item.version, expected_version)
        for field, value in values.items():
            setattr(item, field, value)
        item.version += 1
        item.save()
    else:
        check_version(0, expected_version)
        item = FollowUp.objects.create(
            organization_id=organization_id, patient_id=patient_id, created_by=user, **values
        )
    FollowUpRevision.objects.create(
        follow_up=item, version=item.version, actor=user, snapshot=follow_up_snapshot(item)
    )
    record_request_result(
        user, organization_id, "follow_up.save", request_id, request_data, item.id
    )
    audit(user, "follow_up.saved", organization_id, item.id)
    return item
