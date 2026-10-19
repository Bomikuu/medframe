from config.errors import DomainError
from medframe_apps.anatomy.models import (
    AnatomyChartRevision,
    AnatomyFinding,
    AnatomyFindingIdentity,
)
from medframe_apps.anatomy.policy import require_anatomy_patient
from medframe_apps.anatomy.services import latest_findings
from medframe_apps.record_filters import page_records, parse_filters


def stamp(chart):
    revision = chart.revision
    return {
        "id": str(chart.id),
        "revision_id": str(revision.id),
        "version": revision.version,
        "created_at": revision.created_at.isoformat(),
        "author": revision.author.display_name,
        "encounter_id": str(revision.encounter_id),
        "registry_version": chart.registry_version,
    }


def finding_details(row):
    return {
        **row.content,
        "source_revision_id": str(row.revision_id),
        "recorded_at": row.revision.created_at.isoformat(),
        "author": row.revision.author.display_name,
    }


def exact_chart(org, patient_id, revision_id):
    from medframe_apps.encounters.models import EncounterRevision

    revision = EncounterRevision.objects.filter(
        id=revision_id, organization_id=org, patient_id=patient_id
    ).first()
    if revision is None:
        raise DomainError("NOT_FOUND", "This anatomical revision is unavailable.", 404)
    return (
        AnatomyChartRevision.objects.select_related("revision__author")
        .filter(revision=revision)
        .first()
    )


def read_anatomy_chart(
    user, organization_id, patient_id, *, revision_id=None, filters=None, after=None, first=20
):
    require_anatomy_patient(user, organization_id, patient_id)
    criteria = parse_filters(filters)
    chart = exact_chart(organization_id, patient_id, revision_id) if revision_id else None
    rows = (
        AnatomyFinding.objects.filter(anatomychartentry__chart=chart)
        if chart
        else (
            AnatomyFinding.objects.none()
            if revision_id
            else AnatomyFinding.objects.filter(id__in=latest_findings(patient_id).values("id"))
        )
    )
    if criteria.query:
        rows = rows.filter(content__description__icontains=criteria.query)
    if criteria.status:
        rows = rows.filter(status=criteria.status)
    if criteria.type:
        rows = rows.filter(layer=criteria.type)
    page = page_records(
        rows.select_related("revision__author"),
        scope=f"anatomy:{user.id}:{organization_id}:{patient_id}:{revision_id}",
        filters=criteria,
        after=after,
        first=first,
        serialize=finding_details,
    )
    return {**page, "chart": stamp(chart) if chart else None, "historical": bool(revision_id)}


def anatomy_revisions(user, organization_id, patient_id, after=None, first=20):
    require_anatomy_patient(user, organization_id, patient_id)
    return page_records(
        AnatomyChartRevision.objects.filter(
            revision__organization_id=organization_id, revision__patient_id=patient_id
        ).select_related("revision__author"),
        scope=f"anatomy-history:{user.id}:{organization_id}:{patient_id}",
        after=after,
        first=first,
        serialize=stamp,
    )


def compare_anatomy_charts(
    user, organization_id, patient_id, left_revision_id, right_revision_id, after=None, first=20
):
    require_anatomy_patient(user, organization_id, patient_id)
    left = exact_chart(organization_id, patient_id, left_revision_id)
    right = exact_chart(organization_id, patient_id, right_revision_id)
    identities = AnatomyFindingIdentity.objects.filter(
        anatomyfinding__anatomychartentry__chart__in=[value for value in [left, right] if value]
    ).distinct()

    def difference(identity):
        def row(chart):
            return (
                AnatomyFinding.objects.filter(identity=identity, anatomychartentry__chart=chart)
                .select_related("revision__author")
                .first()
                if chart
                else None
            )

        a, b = row(left), row(right)

        def comparable(value):
            return {k: v for k, v in value.content.items() if k != "source_revision_id"}

        kind = (
            "not_recorded_on_this_side"
            if a is None or b is None
            else "same"
            if comparable(a) == comparable(b)
            else "changed"
        )
        return {
            "key": str(identity.id),
            "kind": kind,
            "left": finding_details(a) if a else None,
            "right": finding_details(b) if b else None,
        }

    return {
        **page_records(
            identities,
            scope=f"anatomy-compare:{user.id}:{organization_id}:{patient_id}:{left_revision_id}:{right_revision_id}",
            after=after,
            first=first,
            serialize=difference,
        ),
        "left": stamp(left) if left else None,
        "right": stamp(right) if right else None,
        "notice": "Absence from a snapshot does not mean resolved.",
    }
