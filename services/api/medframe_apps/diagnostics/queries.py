from django.db import transaction
from django.db.models import Q

from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.diagnostics.models import (
    DiagnosticCenter,
    DiagnosticEvent,
    DiagnosticPartnership,
    ResultDraft,
)
from medframe_apps.diagnostics.partnerships import center_details
from medframe_apps.diagnostics.policy import get_request, request_scope
from medframe_apps.diagnostics.results import result_summary
from medframe_apps.documents.models import DocumentVersion
from medframe_apps.organizations.policy import permissions_for, require_membership
from medframe_apps.patients.services import scoped_patients
from medframe_apps.record_filters import filter_dates, page_records, parse_filters


def row_summary(row):
    return {
        "id": str(row.id),
        "number": row.number,
        "version": row.version,
        "state": row.state,
        "sharing": row.sharing,
        "patient_id": str(row.patient_id),
        "patient_name": row.package.get("identity", {}).get("name", row.patient.full_name),
        "test_name": row.details["test_name"],
        "modality": row.details["modality"],
        "created_at": row.created_at.isoformat(),
        "center_name": row.assignment.partnership.center.name if row.assignment_id else None,
    }


@transaction.atomic
def request_detail(request, organization_id, request_id, *, context):
    row = get_request(request, organization_id, request_id, context=context, lock=True)
    result = row_summary(row)
    from medframe_apps.diagnostics.partnerships import eligible_centers

    result["centers"] = (
        [center_details(item) for item in eligible_centers(row)[:50]]
        if context == "clinic" and row.state in {"awaiting_center", "sent"}
        else []
    )
    result.update(
        {
            "details": row.details,
            "package": row.package,
            "result": result_summary(row.current_result) if row.current_result_id else None,
            "provider": row.provider.membership.user.display_name,
            "accepted_at": row.assignment.accepted_at.isoformat()
            if row.assignment_id and row.assignment.accepted_at
            else None,
        }
    )
    draft = (
        ResultDraft.objects.filter(assignment_id=row.assignment_id).first()
        if context == "center"
        else None
    )
    result["draft"] = (
        {
            "report": draft.report,
            "accession": draft.accession,
            "reason": draft.reason,
            "files": [
                {
                    "id": str(item.version_id),
                    "label": item.version.document.label,
                    "content_type": item.version.content_type,
                    "scan_state": item.version.scan_state,
                }
                for item in draft.attachments.select_related("version__document").order_by(
                    "created_at"
                )[:20]
            ],
        }
        if draft
        else None
    )
    if context == "clinic" and row.state == "draft":
        result["files"] = [
            {"id": str(item.version_id), "label": item.version.document.label}
            for item in row.requestattachment_set.select_related("version__document").order_by(
                "created_at"
            )[:20]
        ]
    return result


@transaction.atomic
def request_page(
    request, organization_id, *, context, filters=None, after=None, first=20, patient_id=None
):
    query = request_scope(request, organization_id, context).select_related(
        "patient", "assignment__partnership__center"
    )
    parsed = parse_filters(filters)
    if parsed.status:
        if parsed.status not in {
            "draft",
            "awaiting_center",
            "sent",
            "accepted",
            "performed",
            "results_available",
            "reviewed",
            "cancelled",
        }:
            raise DomainError("INVALID_INPUT", "Choose a valid request status.")
        query = query.filter(state=parsed.status)
    if parsed.query:
        query = query.filter(
            Q(number__icontains=parsed.query)
            | Q(details__test_name__icontains=parsed.query)
            | Q(package__identity__name__icontains=parsed.query)
        )
    if parsed.type:
        query = query.filter(details__modality=parsed.type)
    if patient_id:
        query = query.filter(patient_id=patient_id)
    member = require_membership(request.user, organization_id, "workspace.read")
    query = filter_dates(query, parsed, member.organization.timezone)
    return page_records(
        query,
        scope=f"diagnostics:{request.user.id}:{organization_id}:{context}:{patient_id}",
        filters=parsed,
        after=after,
        first=first,
        serialize=row_summary,
    )


@transaction.atomic
def request_history(request, organization_id, request_id, *, context, kind="events", after=None):
    row = get_request(request, organization_id, request_id, context=context, lock=True)
    if kind == "results":
        query = row.results.select_related("actor").all()
        if context == "center":
            query = query.filter(assignment_id=row.assignment_id)
        serialize = result_summary
    elif kind == "events":
        query = DiagnosticEvent.objects.filter(request=row).select_related("actor")

        def serialize(item):
            return {
                "id": str(item.id),
                "action": item.action,
                "reason": item.reason,
                "author": item.actor.display_name,
                "created_at": item.created_at.isoformat(),
            }
    else:
        raise DomainError("INVALID_INPUT", "Choose events or results.")
    return page_records(
        query,
        scope=f"diagnostic-history:{request.user.id}:{organization_id}:{row.id}:{context}:{kind}",
        after=after,
        serialize=serialize,
    )


@transaction.atomic
def diagnostic_setup(request, organization_id, search="", patient_id=None):
    require_session_realm(request, "staff")
    member = require_membership(request.user, organization_id, "workspace.read")
    permissions = permissions_for(member)
    patients = []
    files = []
    if "diagnostics.request" in permissions:
        query = scoped_patients(request.user, organization_id, "patients.clinical.read")
        if patient_id:
            query = query.filter(id=patient_id)
        elif search and len(search) <= 160:
            query = query.filter(Q(full_name__icontains=search) | Q(reference__icontains=search))
        else:
            query = query.none()
        patients = [
            {"id": str(item.id), "name": item.full_name, "reference": item.reference}
            for item in query.order_by("full_name", "id")[:20]
        ]
        if patient_id and patients:
            files = [
                {"id": str(item.id), "label": item.document.label}
                for item in DocumentVersion.objects.filter(
                    document__organization_id=organization_id,
                    document__patient_id=patient_id,
                    document__purpose="clinical",
                    scan_state="clean",
                )
                .select_related("document")
                .order_by("-created_at", "-id")[:50]
            ]
    centers = []
    if "diagnostics.partners.manage" in permissions:
        for center in (
            DiagnosticCenter.objects.filter(organization__active=True)
            .exclude(organization_id=organization_id)
            .order_by("name", "id")[:50]
        ):
            partnership = DiagnosticPartnership.objects.filter(
                organization_id=organization_id, center=center
            ).first()
            centers.append(
                {
                    **center_details(center),
                    "authorized": partnership.active if partnership else False,
                    "partnership_version": partnership.version if partnership else 0,
                }
            )
    return {"patients": patients, "files": files, "centers": centers}
