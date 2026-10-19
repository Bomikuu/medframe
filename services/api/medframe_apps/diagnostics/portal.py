from django.db import transaction

from medframe_apps.common import check_version
from medframe_apps.diagnostics.models import DiagnosticRequest
from medframe_apps.diagnostics.partnerships import center_details, eligible_centers
from medframe_apps.diagnostics.policy import diagnostic_lock, unavailable
from medframe_apps.diagnostics.services import event, select_center
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.portal.policy import require_portal_link
from medframe_apps.record_filters import page_records


def patient_summary(row):
    return {
        "id": str(row.id),
        "number": row.number,
        "test_name": row.details["test_name"],
        "modality": row.details["modality"],
        "instructions": row.details["instructions"],
        "state": row.state,
        "version": row.version,
        "sharing": row.sharing,
        "center_name": row.assignment.partnership.center.name if row.assignment_id else None,
        "created_at": row.created_at.isoformat(),
    }


def patient_scope(link):
    return (
        DiagnosticRequest.objects.filter(
            organization_id=link.organization_id, patient_id=link.patient_id
        )
        .exclude(state="draft")
        .select_related("assignment__partnership__center")
    )


def patient_request_page(request, link_id, after=None):
    link = require_portal_link(request, link_id)
    return page_records(
        patient_scope(link),
        scope=f"patient-diagnostics:{request.user.id}:{link.id}",
        after=after,
        serialize=patient_summary,
    )


def patient_request_detail(request, link_id, request_id):
    link = require_portal_link(request, link_id)
    row = patient_scope(link).filter(id=request_id).first()
    if row is None:
        raise unavailable()
    centers = (
        [center_details(item) for item in eligible_centers(row)[:50]]
        if row.sharing and row.state in {"awaiting_center", "sent"}
        else []
    )
    return {**patient_summary(row), "centers": centers}


@transaction.atomic
def patient_select_center(
    request, link_id, request_id, center_id, expected_version, request_id_key
):
    initial = require_portal_link(request, link_id)
    diagnostic_lock(initial.organization_id)
    link = require_portal_link(request, link_id, lock=True)
    row = patient_scope(link).select_for_update(of=("self",)).filter(id=request_id).first()
    if row is None:
        raise unavailable()
    values = {
        "request": str(request_id),
        "center": str(center_id),
        "version": expected_version,
        "link": str(link.id),
    }
    previous = replay_request(
        request.user, link.organization_id, "diagnostic.select", request_id_key, values
    )
    if previous:
        return patient_request_detail(request, link_id, previous)
    check_version(row.version, expected_version)
    select_center(request, row, center_id)
    row.version += 1
    row.save()
    event(request, row, "patient_selected_center")
    record_request_result(
        request.user, link.organization_id, "diagnostic.select", request_id_key, values, row.id
    )
    return patient_request_detail(request, link_id, row.id)
