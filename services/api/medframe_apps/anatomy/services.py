from config.errors import DomainError
from medframe_apps.anatomy.models import (
    AnatomyChartEntry,
    AnatomyChartRevision,
    AnatomyFinding,
    AnatomyFindingIdentity,
)
from medframe_apps.anatomy.policy import require_anatomy_patient
from medframe_apps.common import advisory_lock


def latest_findings(patient_id, *, exclude_encounter=None):
    query = AnatomyFinding.objects.filter(identity__patient_id=patient_id)
    if exclude_encounter:
        query = query.exclude(revision__encounter_id=exclude_encounter)
    return query.order_by("identity_id", "-revision__created_at", "-revision_id").distinct(
        "identity_id"
    )


def validate_anatomy_draft(user, encounter, findings):
    require_anatomy_patient(user, encounter.organization_id, encounter.patient_id, write=True)
    for item in findings:
        key = item["key"]
        advisory_lock(f"anatomy-finding:{key}")
        identity = AnatomyFindingIdentity.objects.filter(id=key).first()
        if identity and (
            identity.patient_id != encounter.patient_id
            or identity.organization_id != encounter.organization_id
        ):
            raise DomainError("INVALID_INPUT", "Finding identity belongs to another patient.")
        latest = (
            AnatomyFinding.objects.filter(identity_id=key)
            .order_by("-revision__created_at", "-revision_id")
            .first()
        )
        source = item.get("source_revision_id")
        if (
            latest
            and latest.revision.encounter_id != encounter.id
            and str(latest.revision_id) != source
        ):
            raise DomainError(
                "CONFLICT", "Carry forward the latest exact finding revision before editing.", 409
            )
        if (
            source
            and not AnatomyFinding.objects.filter(
                identity_id=key, revision_id=source, identity__patient_id=encounter.patient_id
            ).exists()
        ):
            raise DomainError("INVALID_INPUT", "Choose a finding source from this patient.")
        if identity is None:
            AnatomyFindingIdentity.objects.create(
                id=key, patient_id=encounter.patient_id, organization_id=encounter.organization_id
            )
    previous = encounter.revisions.order_by("-version").first()
    if previous:
        old_keys = {item["key"] for item in previous.content.get("anatomy_findings", [])}
        if not old_keys <= {item["key"] for item in findings}:
            raise DomainError(
                "INVALID_INPUT",
                "Retain finalized findings or mark them resolved/entered in error "
                "in the amendment.",
            )
    return findings


def capture_anatomy_revision(encounter, revision, content):
    validate_anatomy_draft(revision.author, encounter, content["anatomy_findings"])
    for item in content["anatomy_findings"]:
        AnatomyFinding.objects.create(
            identity_id=item["key"],
            revision=revision,
            structure_id=item["structure_id"],
            side=item["side"],
            layer=item["layer"],
            status=item["status"],
            content=item,
        )
    chart = AnatomyChartRevision.objects.create(revision=revision)
    rows = latest_findings(encounter.patient_id)
    AnatomyChartEntry.objects.bulk_create(
        [AnatomyChartEntry(chart=chart, finding=item) for item in rows]
    )
    return chart
