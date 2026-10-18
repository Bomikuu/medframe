import hashlib

from django.db import transaction
from pydantic import ValidationError

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.encounters.inputs import PlanInput, PlanItemInput
from medframe_apps.encounters.models import EncounterRevision
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.services import require_patient
from medframe_apps.treatments.models import TreatmentPlan, TreatmentPlanEvent, TreatmentPlanItem
from medframe_apps.treatments.snapshots import preserve_plan
from medframe_apps.treatments.work import edit_plan_item, reorder_plan  # noqa: F401


@transaction.atomic
def create_treatment_plan(user, organization_id, patient_id, data, request_id):
    require_membership(user, organization_id, "treatments.write")
    require_patient(user, organization_id, patient_id, "patients.clinical.write", lock=True)
    try:
        parsed = PlanInput.model_validate(data)
    except ValidationError:
        raise DomainError(
            "INVALID_INPUT", "Add a plan title and 1–30 valid ordered items."
        ) from None
    digest = hashlib.sha256((str(patient_id) + parsed.model_dump_json()).encode()).hexdigest()
    advisory_lock(f"plan:{organization_id}:{user.id}:{request_id}")
    previous = TreatmentPlan.objects.filter(
        organization_id=organization_id, created_by=user, request_id=request_id
    ).first()
    if previous:
        if previous.request_digest != digest:
            raise DomainError(
                "CONFLICT", "This plan request was already used with different details.", 409
            )
        return previous
    plan = TreatmentPlan.objects.create(
        organization_id=organization_id,
        patient_id=patient_id,
        created_by=user,
        title=parsed.title,
        request_id=request_id,
        request_digest=digest,
    )
    TreatmentPlanItem.objects.bulk_create(
        [
            TreatmentPlanItem(plan=plan, position=index, **value.model_dump())
            for index, value in enumerate(parsed.items)
        ]
    )
    TreatmentPlanEvent.objects.create(plan=plan, actor=user, status="created", version=1)
    audit(user, "treatment.plan.created", organization_id, plan.id)
    preserve_plan(plan, user)
    return plan


@transaction.atomic
def update_treatment_item(
    user,
    organization_id,
    plan_id,
    item_id,
    status,
    expected_version,
    completed_revision_id=None,
    request_id=None,
):
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
    plan = TreatmentPlan.objects.select_for_update().get(id=plan_id)
    values = {
        "plan": str(plan_id),
        "item": str(item_id),
        "status": status,
        "version": expected_version,
        "evidence": str(completed_revision_id) if completed_revision_id else None,
    }
    if request_id and replay_request(user, organization_id, "plan.status", request_id, values):
        return plan
    check_version(plan.version, expected_version)
    item = plan.items.filter(id=item_id).first()
    if item is None or status not in {
        "proposed",
        "planned",
        "in_progress",
        "completed",
        "cancelled",
    }:
        raise DomainError("INVALID_INPUT", "Choose a valid plan item and status.")
    if item.completed_revision_id:
        raise DomainError(
            "IMMUTABLE",
            "Completed clinical evidence is preserved. Record subsequent care in a new encounter.",
            409,
        )
    if status == "completed":
        revision = EncounterRevision.objects.filter(
            id=completed_revision_id, patient_id=plan.patient_id, organization_id=organization_id
        ).first()
        if revision is None or not any(
            value["status"] == "completed"
            and value["description"] == item.description
            and value["tooth"] == item.tooth
            for value in revision.content["procedures"]
        ):
            raise DomainError(
                "EVIDENCE_REQUIRED",
                "Complete the matching procedure in a finalized consultation first.",
            )
        item.completed_revision = revision
    item.status = status
    item.save()
    plan.version += 1
    plan.save(update_fields=["version"])
    TreatmentPlanEvent.objects.create(
        plan=plan, item=item, actor=user, status=status, version=plan.version
    )
    audit(user, "treatment.item.updated", organization_id, plan.id)
    preserve_plan(plan, user)
    if request_id:
        record_request_result(user, organization_id, "plan.status", request_id, values, plan.id)
    return plan


@transaction.atomic
def add_treatment_item(user, organization_id, plan_id, data, expected_version, request_id=None):
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
    plan = TreatmentPlan.objects.select_for_update().get(id=plan_id)
    values = {"plan": str(plan_id), "data": data, "version": expected_version}
    if request_id and replay_request(user, organization_id, "plan.add", request_id, values):
        return plan
    check_version(plan.version, expected_version)
    try:
        item = PlanItemInput.model_validate(data)
    except ValidationError:
        raise DomainError("INVALID_INPUT", "Choose a valid proposed treatment item.") from None
    position = plan.items.count()
    if position >= 30:
        raise DomainError("INVALID_INPUT", "A plan can contain at most 30 items.")
    created = TreatmentPlanItem.objects.create(plan=plan, position=position, **item.model_dump())
    plan.version += 1
    plan.save(update_fields=["version"])
    TreatmentPlanEvent.objects.create(
        plan=plan, item=created, actor=user, status="added", version=plan.version
    )
    audit(user, "treatment.item.added", organization_id, plan.id)
    preserve_plan(plan, user)
    if request_id:
        record_request_result(user, organization_id, "plan.add", request_id, values, plan.id)
    return plan
