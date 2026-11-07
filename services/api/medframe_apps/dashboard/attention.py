from django.db.models import Case, IntegerField, Value, When

from medframe_apps.encounters.models import Encounter
from medframe_apps.treatments.models import FollowUp
from medframe_apps.diagnostics.models import DiagnosticRequest
from medframe_apps.diagnostics.policy import request_scope
from medframe_apps.operations.portraits import attach_portraits


def attention(request, member, branch, day, codes, clinical_patients, page):
    notes = Encounter.objects.filter(
        organization=member.organization,
        branch=branch,
        patient_id__in=clinical_patients.values("id"),
    ).exclude(status="finalized")
    follow_ups = FollowUp.objects.filter(
        organization=member.organization,
        patient__branch=branch,
        patient_id__in=clinical_patients.values("id"),
        status="open",
        due_date__lte=day,
    )
    diagnostics = DiagnosticRequest.objects.none()
    if "diagnostics.read" in codes and "patients.clinical.read" in codes:
        diagnostics = request_scope(request, member.organization_id, "clinic").filter(branch=branch)
    if "organization.manage" not in codes:
        notes = notes.filter(provider__membership__user=request.user)
        follow_ups = follow_ups.filter(created_by=request.user)
        diagnostics = diagnostics.filter(provider__membership__user=request.user)
    reviews = diagnostics.filter(state="results_available")
    outstanding = diagnostics.filter(state__in=["awaiting_center", "sent", "accepted", "performed"])
    totals = {
        "notes": notes.count(),
        "follow_ups": follow_ups.count(),
        "results": reviews.count(),
        "orders": outstanding.count(),
    }
    work = [
        {
            "id": str(item.id),
            "patient_id": str(item.patient_id),
            "patient": item.patient.full_name,
            "provider_id": str(item.provider_id),
            "provider": item.provider.membership.user.display_name,
            "status": item.status,
            "at": item.updated_at.isoformat(),
            "mine": item.provider.membership.user_id == request.user.id,
            "specialty": item.provider.specialty,
        }
        for item in notes.select_related("patient", "provider__membership__user").order_by(
            "updated_at", "id"
        )[:6]
    ]
    stop = page * 8
    tasks = [
        {
            "id": str(item.id),
            "kind": "note",
            "patient_id": str(item.patient_id),
            "patient": item.patient.full_name,
            "title": "Finalize consultation"
            if item.status == "completed"
            else "Continue consultation notes",
            "at": item.updated_at.isoformat(),
            "responsible": item.provider.membership.user.display_name,
            "overdue": False,
        }
        for item in notes.select_related("patient", "provider__membership__user").order_by(
            "updated_at", "id"
        )[:stop]
    ]
    for item in follow_ups.select_related("patient", "created_by").order_by(
        "due_date", "created_at", "id"
    )[:stop]:
        tasks.append(
            {
                "id": str(item.id),
                "kind": "follow_up",
                "patient_id": str(item.patient_id),
                "patient": item.patient.full_name,
                "title": item.instructions,
                "at": item.due_date.isoformat(),
                "responsible": item.created_by.display_name,
                "overdue": item.due_date < day,
            }
        )
    prioritized_reviews = reviews.annotate(
        recorded_priority=Case(
            When(details__urgency="urgent", then=Value(0)),
            default=Value(1),
            output_field=IntegerField(),
        )
    )
    for item in prioritized_reviews.select_related(
        "patient", "provider__membership__user", "current_result"
    ).order_by("recorded_priority", "current_result__created_at", "id")[:stop]:
        tasks.append(
            {
                "id": str(item.id),
                "kind": "result",
                "patient_id": str(item.patient_id),
                "patient": item.patient.full_name,
                "title": f"Review results · {item.number}",
                "urgent": item.details.get("urgency") == "urgent",
                "at": item.current_result.created_at.isoformat()
                if item.current_result
                else item.created_at.isoformat(),
                "responsible": item.provider.membership.user.display_name,
                "overdue": False,
            }
        )
    tasks.sort(
        key=lambda row: (not row.get("urgent", False), not row["overdue"], row["at"], row["id"])
    )
    orders = [
        {
            "id": str(item.id),
            "patient_id": str(item.patient_id),
            "patient": item.patient.full_name,
            "title": item.number,
            "status": item.state,
            "at": item.created_at.isoformat(),
        }
        for item in outstanding.select_related("patient").order_by("created_at", "id")[:4]
    ]
    return attach_portraits(
        request,
        member.organization_id,
        {
            "totals": totals,
            "items": tasks[stop - 8 : stop],
            "page": page,
            "total": totals["notes"] + totals["follow_ups"] + totals["results"],
            "unfinished": work,
            "orders": orders,
        },
    )
