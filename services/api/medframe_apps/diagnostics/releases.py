from config.errors import DomainError
from medframe_apps.diagnostics.models import ResultRevision
from medframe_apps.diagnostics.results import result_summary
from medframe_apps.patients.services import require_patient
from medframe_apps.record_filters import page_records


def reviewed_results(organization_id, patient_id):
    return ResultRevision.objects.filter(
        request__organization_id=organization_id,
        request__patient_id=patient_id,
        review__isnull=False,
        current_requests__id__isnull=False,
        request__state="reviewed",
    ).select_related("actor", "request")


def reviewed_result_sources(user, organization_id, patient_id, after=None):
    require_patient(user, organization_id, patient_id, "patients.clinical.write")
    return page_records(
        reviewed_results(organization_id, patient_id),
        scope=f"diagnostic-release-sources:{user.id}:{organization_id}:{patient_id}",
        after=after,
        serialize=lambda item: {
            "id": str(item.id),
            "version": item.sequence,
            "label": item.request.details["test_name"],
            "created_at": item.created_at.isoformat(),
        },
    )


def diagnostic_release_snapshot(user, organization_id, patient_id, result_ids):
    require_patient(user, organization_id, patient_id, "patients.clinical.write", lock=True)
    rows = []
    files = []
    for identifier in result_ids:
        row = reviewed_results(organization_id, patient_id).filter(id=identifier).first()
        if row is None:
            raise DomainError(
                "INVALID_SOURCE", "Choose a current reviewed result for this patient.", 409
            )
        from medframe_apps.diagnostics.models import DiagnosticRequest

        DiagnosticRequest.objects.select_for_update().get(id=row.request_id)
        if not reviewed_results(organization_id, patient_id).filter(id=row.id).exists():
            raise DomainError("CONFLICT", "The result changed. Preview the release again.", 409)
        summary = result_summary(row)
        if row.attachments.exclude(version__scan_state="clean").exists():
            raise DomainError("UNSAFE_DOCUMENT", "Selected result files must be clean.", 409)
        rows.append({**summary, "test_name": row.request.details["test_name"]})
        files.extend(summary["files"])
    return {"diagnostics": rows, "documents": files}
