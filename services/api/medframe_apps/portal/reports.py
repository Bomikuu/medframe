from django.db import transaction

from config.errors import DomainError
from medframe_apps.common import check_version
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.patients.models import PatientClinicalRevision
from medframe_apps.patients.services import require_patient
from medframe_apps.portal.models import PatientReport, ReportReview
from medframe_apps.portal.policy import require_portal_link


def report_details(item):
    review = item.reviews.order_by("-version").first()
    return {
        "id": str(item.id),
        "category": item.category,
        "text": item.text,
        "created_at": item.created_at.isoformat(),
        "author": item.author.display_name,
        "state": review.state,
        "version": review.version,
        "history_revision_id": str(review.history_revision_id)
        if review.history_revision_id
        else None,
    }


@transaction.atomic
def submit_report(request, link_id, category, text, request_id):
    link = require_portal_link(request, link_id, lock=True)
    if (
        category not in {"history", "allergy", "medication", "other"}
        or not isinstance(text, str)
        or not 1 <= len(text.strip()) <= 6000
        or len(text.encode()) > 12288
    ):
        raise DomainError(
            "INVALID_INPUT", "Use a supported category and 1–6,000 characters within 12KiB."
        )
    values = {"link": str(link.id), "category": category, "text": text}
    previous = replay_request(
        request.user, link.organization_id, "portal.report", request_id, values
    )
    if previous:
        return PatientReport.objects.get(id=previous)
    report = PatientReport.objects.create(
        organization_id=link.organization_id,
        patient_id=link.patient_id,
        link=link,
        author=request.user,
        category=category,
        text=text.strip(),
    )
    ReportReview.objects.create(report=report, author=request.user, version=1, state="received")
    record_request_result(
        request.user, link.organization_id, "portal.report", request_id, values, report.id
    )
    return report


@transaction.atomic
def review_report(user, org, report_id, state, expected_version, history_revision_id=None):
    initial = PatientReport.objects.filter(id=report_id, organization_id=org).first()
    if initial is None:
        raise DomainError("NOT_FOUND", "Patient report is unavailable.", 404)
    require_patient(user, org, initial.patient_id, "patients.clinical.write", lock=True)
    report = PatientReport.objects.select_for_update().get(id=initial.id)
    previous = report.reviews.order_by("-version").first()
    check_version(previous.version, expected_version)
    if state not in {"acknowledged", "reviewed"}:
        raise DomainError("INVALID_INPUT", "Choose acknowledged or reviewed.")
    if (
        history_revision_id
        and not PatientClinicalRevision.objects.filter(
            id=history_revision_id, patient_id=report.patient_id, organization_id=org
        ).exists()
    ):
        raise DomainError("INVALID_INPUT", "Choose an existing history revision for this patient.")
    ReportReview.objects.create(
        report=report,
        author=user,
        version=previous.version + 1,
        state=state,
        history_revision_id=history_revision_id,
    )
    return report
