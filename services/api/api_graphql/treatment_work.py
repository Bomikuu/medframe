from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from config.errors import DomainError
from medframe_apps.patients.services import require_patient
from medframe_apps.record_filters import page_records
from medframe_apps.treatments.follow_ups import follow_up_snapshot, save_follow_up
from medframe_apps.treatments.models import FollowUp, TreatmentPlan, TreatmentPlanRevision
from medframe_apps.treatments.snapshots import plan_snapshot
from medframe_apps.treatments.work import edit_plan_item, reorder_plan


@strawberry.type
class TreatmentWorkQuery:
    @strawberry.field
    def follow_ups(
        self, info: Info, organization_id: UUID, patient_id: UUID, after: str | None = None
    ) -> JSON:
        require_patient(info.context.user, organization_id, patient_id, "patients.clinical.read")
        return page_records(
            FollowUp.objects.filter(organization_id=organization_id, patient_id=patient_id),
            scope=f"followups:{organization_id}:{patient_id}",
            after=after,
            serialize=follow_up_snapshot,
        )

    @strawberry.field
    def plan_revisions(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        plan_id: UUID,
        after: str | None = None,
    ) -> JSON:
        require_patient(info.context.user, organization_id, patient_id, "patients.clinical.read")
        if not TreatmentPlan.objects.filter(
            id=plan_id, organization_id=organization_id, patient_id=patient_id
        ).exists():
            raise DomainError("NOT_FOUND", "Treatment plan is unavailable.", 404)
        return page_records(
            TreatmentPlanRevision.objects.filter(plan_id=plan_id).select_related("actor"),
            scope=f"plan-history:{plan_id}",
            after=after,
            serialize=lambda item: {
                "id": str(item.id),
                "version": item.version,
                "snapshot": item.snapshot,
                "created_at": item.created_at.isoformat(),
                "author": item.actor.display_name,
                "provenance": item.provenance,
            },
        )


@strawberry.type
class TreatmentWorkMutation:
    @strawberry.mutation
    def reorder_treatment_plan(
        self,
        info: Info,
        organization_id: UUID,
        plan_id: UUID,
        item_ids: list[UUID],
        expected_version: int,
        request_id: UUID,
    ) -> JSON:
        return plan_snapshot(
            reorder_plan(
                info.context.user, organization_id, plan_id, item_ids, expected_version, request_id
            )
        )

    @strawberry.mutation
    def edit_treatment_item(
        self,
        info: Info,
        organization_id: UUID,
        plan_id: UUID,
        item_id: UUID,
        data: JSON,
        expected_version: int,
        request_id: UUID,
    ) -> JSON:
        return plan_snapshot(
            edit_plan_item(
                info.context.user,
                organization_id,
                plan_id,
                item_id,
                data,
                expected_version,
                request_id,
            )
        )

    @strawberry.mutation
    def save_follow_up(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        data: JSON,
        expected_version: int,
        request_id: UUID,
    ) -> JSON:
        return follow_up_snapshot(
            save_follow_up(
                info.context.user, organization_id, patient_id, data, expected_version, request_id
            )
        )
