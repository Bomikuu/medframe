"""Clinical comparisons describe recorded evidence, never infer recovery from absence."""

from django.db import transaction
from django.db.models import Q

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.dental.reference import TEETH
from medframe_apps.encounters.models import EncounterRevision
from medframe_apps.encounters.services import chart_projection
from medframe_apps.patients.services import require_patient
from medframe_apps.record_filters import page_records


def revision_summary(item):
    return {
        "revision_id": str(item.id),
        "encounter_id": str(item.encounter_id),
        "version": item.version,
        "created_at": item.created_at.isoformat(),
        "reason": item.encounter.reason,
        "author_name": item.author.display_name,
    }


def revision_query(organization_id, patient_id):
    return EncounterRevision.objects.filter(
        organization_id=organization_id, patient_id=patient_id
    ).select_related("author", "encounter")


@transaction.atomic
def chart_revisions(user, organization_id, patient_id, after=None, first=20):
    require_patient(user, organization_id, patient_id, "patients.clinical.read")
    audit(user, "dental.revisions.read", organization_id, patient_id)
    return page_records(
        revision_query(organization_id, patient_id),
        scope=f"chart:{organization_id}:{patient_id}",
        after=after,
        first=first,
        serialize=revision_summary,
    )


@transaction.atomic
def compare_dental_charts(
    user, organization_id, patient_id, left_revision_id, right_revision_id=None
):
    require_patient(user, organization_id, patient_id, "patients.clinical.read")

    def side(identifier):
        if identifier is None:
            return {
                "revision_id": None,
                "label": "Current finalized chart",
                "findings": chart_projection(patient_id),
            }
        item = revision_query(organization_id, patient_id).filter(id=identifier).first()
        if item is None:
            raise DomainError("NOT_FOUND", "Chart revision is unavailable.", 404)
        return {**revision_summary(item), "findings": item.chart}

    left, right = side(left_revision_id), side(right_revision_id)
    previous = {value["key"]: value for value in left["findings"]}
    current = {value["key"]: value for value in right["findings"]}
    changes = []
    clinical_fields = ("tooth", "surfaces", "condition", "severity", "status", "notes")
    for key in sorted(previous.keys() | current.keys()):
        before, after = previous.get(key), current.get(key)
        if before is None:
            kind = "added"
        elif after is None:
            kind = "absent_from_snapshot"
        elif all(before.get(field) == after.get(field) for field in clinical_fields):
            continue
        else:
            kind = (
                "explicitly_resolved"
                if after["status"] == "resolved" and before["status"] != "resolved"
                else "changed"
            )
        changes.append(
            {
                "key": key,
                "tooth": (after or before)["tooth"],
                "kind": kind,
                "before": before,
                "after": after,
            }
        )
    audit(user, "dental.comparison.read", organization_id, patient_id)
    return {"left": left, "right": right, "differences": changes, "summary_limit_per_tooth": 5}


@transaction.atomic
def tooth_evidence(user, organization_id, patient_id, tooth, after=None, first=20):
    require_patient(user, organization_id, patient_id, "patients.clinical.read")
    if tooth not in TEETH:
        raise DomainError("INVALID_INPUT", "Choose a valid FDI tooth.")
    query = (
        revision_query(organization_id, patient_id)
        .filter(Q(toothfinding__tooth=tooth) | Q(procedure__tooth=tooth))
        .distinct()
    )

    def serialize(item):
        return {
            **revision_summary(item),
            "findings": [
                value for value in item.content.get("findings", []) if value["tooth"] == tooth
            ],
            "procedures": [
                value for value in item.content.get("procedures", []) if value["tooth"] == tooth
            ],
        }

    audit(user, "dental.tooth_evidence.read", organization_id, patient_id)
    return page_records(
        query,
        scope=f"tooth:{organization_id}:{patient_id}:{tooth}",
        after=after,
        first=first,
        serialize=serialize,
    )
