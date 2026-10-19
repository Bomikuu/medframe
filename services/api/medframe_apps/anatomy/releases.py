from django.db import transaction

from config.errors import DomainError
from medframe_apps.anatomy.history import anatomy_revisions, stamp
from medframe_apps.anatomy.models import AnatomyChartRevision
from medframe_apps.anatomy.policy import require_anatomy_patient
from medframe_apps.anatomy.reference import anatomy_reference


@transaction.atomic
def anatomy_release_sources(user, org, patient_id, after=None):
    require_anatomy_patient(user, org, patient_id, write=True)
    page = anatomy_revisions(user, org, patient_id, after)
    page["items"] = [
        {**item, "label": f"Anatomy · revision {item['version']}"} for item in page["items"]
    ]
    return page


def build_anatomy_release(user, org, patient_id, selection):
    if not selection.anatomy_chart_revision_id:
        if selection.anatomy_finding_keys or selection.anatomy_include_notes:
            raise DomainError("INVALID_SOURCE", "Select an exact anatomical chart first.")
        return None
    require_anatomy_patient(user, org, patient_id, write=True)
    chart = (
        AnatomyChartRevision.objects.select_related("revision__author")
        .filter(
            id=selection.anatomy_chart_revision_id,
            revision__organization_id=org,
            revision__patient_id=patient_id,
        )
        .first()
    )
    keys = {str(key) for key in selection.anatomy_finding_keys}
    if chart is None or not keys:
        raise DomainError("INVALID_SOURCE", "Choose an exact chart and explicitly select findings.")
    rows = list(chart.entries.filter(finding__identity_id__in=keys).select_related("finding"))
    if len(rows) != len(keys):
        raise DomainError(
            "INVALID_SOURCE", "A selected anatomical finding is unavailable in this chart."
        )
    structures = {item["id"]: item for item in anatomy_reference()["structures"]}
    findings = []
    for entry in rows:
        value = entry.finding.content
        safe = {
            key: value.get(key)
            for key in [
                "registry_version",
                "layer",
                "structure_id",
                "side",
                "description",
                "category",
                "severity",
                "status",
                "anchor",
                "terminology_system",
                "code",
            ]
        }
        safe["label"] = structures.get(value["structure_id"], {}).get(
            "label", value["structure_id"]
        )
        if selection.anatomy_include_notes:
            safe["notes"] = value.get("notes", "")
        findings.append(safe)
    source = {
        key: value for key, value in stamp(chart).items() if key not in {"id", "encounter_id"}
    }
    return {
        "source": source,
        "findings": findings,
        "notes_included": selection.anatomy_include_notes,
        "reference_notice": (
            "Generic anatomical reference; not patient-specific geometry or a diagnosis."
        ),
    }
