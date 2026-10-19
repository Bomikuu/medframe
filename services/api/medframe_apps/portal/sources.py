from config.errors import DomainError
from medframe_apps.documents.models import DocumentVersion
from medframe_apps.encounters.models import EncounterRevision
from medframe_apps.patients.services import require_patient
from medframe_apps.record_filters import page_records
from medframe_apps.treatments.models import FollowUpRevision, TreatmentPlanRevision


def release_source_page(user, org, patient_id, kind, after=None):
    require_patient(user, org, patient_id, "patients.clinical.write")
    if kind == "anatomy":
        from medframe_apps.anatomy.releases import anatomy_release_sources

        return anatomy_release_sources(user, org, patient_id, after)
    if kind == "diagnostics":
        from medframe_apps.diagnostics.releases import reviewed_result_sources

        return reviewed_result_sources(user, org, patient_id, after)
    if kind == "encounters":
        query = EncounterRevision.objects.filter(organization_id=org, patient_id=patient_id)

        def label(item):
            return item.content.get("context", {}).get("reason", "Finalized consultation")
    elif kind == "plans":
        query = TreatmentPlanRevision.objects.filter(
            plan__organization_id=org, plan__patient_id=patient_id
        )

        def label(item):
            return item.snapshot["title"]
    elif kind == "follow_ups":
        query = FollowUpRevision.objects.filter(
            follow_up__organization_id=org, follow_up__patient_id=patient_id
        )

        def label(item):
            return item.snapshot["instructions"][:120]
    elif kind == "documents":
        query = DocumentVersion.objects.filter(
            document__organization_id=org,
            document__patient_id=patient_id,
            document__purpose="clinical",
            scan_state="clean",
        ).select_related("document")

        def label(item):
            return item.document.label
    else:
        raise DomainError("INVALID_INPUT", "Choose a release source category.")
    return page_records(
        query,
        scope=f"release-sources:{org}:{patient_id}:{kind}",
        after=after,
        first=50,
        serialize=lambda item: {
            "id": str(item.id),
            "version": item.version,
            "label": label(item),
            "created_at": item.created_at.isoformat(),
        },
    )
