from uuid import UUID

from django.db import transaction
from pydantic import ValidationError

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version
from medframe_apps.encounters.inputs import PlanItemInput
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.services import require_patient
from medframe_apps.treatments.models import TreatmentPlan, TreatmentPlanEvent
from medframe_apps.treatments.snapshots import preserve_plan


def locked_plan(user, organization_id, plan_id):
    require_membership(user, organization_id, "treatments.write")
    selector = (
        TreatmentPlan.objects.filter(id=plan_id, organization_id=organization_id)
        .values("patient_id")
        .first()
    )
    if selector is None:
        raise DomainError("NOT_FOUND", "Treatment plan is unavailable.", 404)
    require_patient(
        user, organization_id, selector["patient_id"], "patients.clinical.write", lock=True
    )
    return TreatmentPlan.objects.select_for_update().get(id=plan_id)


def finish_work(plan, user, status, item=None):
    plan.version += 1
    plan.save(update_fields=["version"])
    TreatmentPlanEvent.objects.create(
        plan=plan, item=item, actor=user, status=status, version=plan.version
    )
    preserve_plan(plan, user)
    audit(user, "treatment." + status, plan.organization_id, plan.id)
    return plan


@transaction.atomic
def reorder_plan(user, organization_id, plan_id, item_ids, expected_version, request_id):
    plan = locked_plan(user, organization_id, plan_id)
    data = {
        "plan": str(plan.id),
        "ids": [str(value) for value in item_ids],
        "version": expected_version,
    }
    if replay_request(user, organization_id, "plan.reorder", request_id, data):
        return plan
    check_version(plan.version, expected_version)
    try:
        identifiers = [UUID(str(value)) for value in item_ids]
    except ValueError:
        raise DomainError("INVALID_INPUT", "Choose the complete ordered plan items.") from None
    items = list(plan.items.all())
    if (
        len(identifiers) != len(items)
        or len(set(identifiers)) != len(items)
        or set(identifiers) != {item.id for item in items}
    ):
        raise DomainError("INVALID_INPUT", "The order must contain every item exactly once.")
    preserve_plan(plan, user)
    for position, identifier in enumerate(identifiers):
        plan.items.filter(id=identifier).update(position=position)
    finish_work(plan, user, "reordered")
    record_request_result(user, organization_id, "plan.reorder", request_id, data, plan.id)
    return plan


@transaction.atomic
def edit_plan_item(user, organization_id, plan_id, item_id, data, expected_version, request_id):
    plan = locked_plan(user, organization_id, plan_id)
    values = {"plan": str(plan.id), "item": str(item_id), "data": data, "version": expected_version}
    if replay_request(user, organization_id, "plan.edit", request_id, values):
        return plan
    check_version(plan.version, expected_version)
    item = plan.items.filter(id=item_id).first()
    if item is None:
        raise DomainError("NOT_FOUND", "Plan item is unavailable.", 404)
    if item.completed_revision_id:
        raise DomainError("IMMUTABLE", "Completed evidence is preserved.", 409)
    try:
        parsed = PlanItemInput.model_validate(data)
    except ValidationError:
        raise DomainError("INVALID_INPUT", "Enter valid proposed treatment details.") from None
    if parsed.status == "completed":
        raise DomainError(
            "EVIDENCE_REQUIRED", "Choose finalized procedure evidence to complete an item."
        )
    preserve_plan(plan, user)
    item.description, item.tooth, item.status = parsed.description, parsed.tooth, parsed.status
    item.save()
    finish_work(plan, user, "edited", item)
    record_request_result(user, organization_id, "plan.edit", request_id, values, plan.id)
    return plan
