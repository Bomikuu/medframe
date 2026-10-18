from medframe_apps.treatments.models import TreatmentPlanRevision


def plan_snapshot(plan):
    items = [
        {
            "id": str(item.id),
            "position": item.position,
            "description": item.description,
            "tooth": item.tooth,
            "status": item.status,
            "completed_revision_id": str(item.completed_revision_id)
            if item.completed_revision_id
            else None,
        }
        for item in plan.items.order_by("position")
    ]
    active = [item for item in items if item["status"] != "cancelled"]
    return {
        "id": str(plan.id),
        "title": plan.title,
        "version": plan.version,
        "items": items,
        "completed": sum(item["status"] == "completed" for item in active),
        "active_total": len(active),
    }


def preserve_plan(plan, actor):
    return TreatmentPlanRevision.objects.get_or_create(
        plan=plan, version=plan.version, defaults={"actor": actor, "snapshot": plan_snapshot(plan)}
    )[0]
