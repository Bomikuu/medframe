import json
from typing import Literal
from uuid import UUID

from django.db import transaction
from django.db.models import Max
from pydantic import Field, ValidationError

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version
from medframe_apps.documents.models import DocumentVersion
from medframe_apps.encounters.inputs import Input
from medframe_apps.encounters.models import Encounter, EncounterRevision
from medframe_apps.idempotency import record_request_result, replay_request, request_digest
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.services import require_patient
from medframe_apps.portal.models import PortalRelease, ReleaseDocument, ReleaseEvent
from medframe_apps.treatments.models import FollowUpRevision, TreatmentPlanRevision


class SelectedEncounter(Input):
    revision_id: UUID
    soap_sections: list[Literal["subjective", "objective", "assessment", "plan"]] = Field(
        default_factory=list, max_length=4
    )
    diagnoses: bool = False
    procedures: bool = False


class ReleaseSelection(Input):
    summary: str = Field(min_length=1, max_length=4000)
    encounters: list[SelectedEncounter] = Field(default_factory=list, max_length=5)
    chart_revision_id: UUID | None = None
    plan_revision_ids: list[UUID] = Field(default_factory=list, max_length=5)
    follow_up_revision_ids: list[UUID] = Field(default_factory=list, max_length=10)
    document_version_ids: list[UUID] = Field(default_factory=list, max_length=20)


def release_writer(user, org, patient_id):
    require_membership(user, org, "encounters.write")
    return require_patient(user, org, patient_id, "patients.clinical.write", lock=True)


def selected_row(queryset, identifier):
    row = queryset.filter(id=identifier).first()
    if row is None:
        raise DomainError(
            "INVALID_SOURCE", "A selected version is unavailable for this patient.", 409
        )
    return row


def revision_stamp(row):
    return {"id": str(row.id), "version": row.version, "created_at": row.created_at.isoformat()}


def build_preview(user, org, patient, data):
    try:
        selection = ReleaseSelection.model_validate(data)
    except ValidationError:
        raise DomainError(
            "INVALID_INPUT", "Choose valid, explicitly selected clinical versions."
        ) from None
    if not any(
        [
            selection.encounters,
            selection.chart_revision_id,
            selection.plan_revision_ids,
            selection.follow_up_revision_ids,
            selection.document_version_ids,
        ]
    ):
        raise DomainError("INVALID_INPUT", "Select at least one clinical source.")
    payload = {
        "summary": selection.summary,
        "encounters": [],
        "chart": None,
        "plans": [],
        "follow_ups": [],
        "documents": [],
    }
    manifest = {"encounters": [], "plans": [], "follow_ups": [], "documents": []}
    revisions = EncounterRevision.objects.filter(
        organization_id=org, patient=patient
    ).select_related("author", "encounter")
    for chosen in selection.encounters:
        row = selected_row(revisions, chosen.revision_id)
        # The parent lock protects against concurrent autosave/amendment/finalization.
        parent = Encounter.objects.select_for_update().get(id=row.encounter_id)
        item = {
            **revision_stamp(row),
            "reason": row.content.get("context", {}).get("reason", ""),
            "author": row.author.display_name,
            "soap": {key: row.content.get("soap", {}).get(key, "") for key in chosen.soap_sections},
        }
        if chosen.diagnoses:
            item["diagnoses"] = [
                {key: value.get(key, "") for key in ["description", "certainty", "code"]}
                for value in row.content.get("diagnoses", [])
            ]
        if chosen.procedures:
            item["procedures"] = [
                {
                    key: value.get(key, [] if key == "surfaces" else "")
                    for key in ["description", "status", "tooth", "surfaces", "notes"]
                }
                for value in row.content.get("procedures", [])
            ]
        payload["encounters"].append(item)
        manifest["encounters"].append({**revision_stamp(row), "aggregate_version": parent.version})
    if selection.chart_revision_id:
        row = selected_row(revisions, selection.chart_revision_id)
        parent = Encounter.objects.select_for_update().get(id=row.encounter_id)
        payload["chart"] = {**revision_stamp(row), "findings": row.chart}
        manifest["chart"] = {**revision_stamp(row), "aggregate_version": parent.version}
    for identifier in selection.plan_revision_ids:
        row = selected_row(
            TreatmentPlanRevision.objects.filter(
                plan__organization_id=org, plan__patient=patient
            ).select_related("plan"),
            identifier,
        )
        type(row.plan).objects.select_for_update().get(id=row.plan_id)
        payload["plans"].append({**revision_stamp(row), "snapshot": row.snapshot})
        manifest["plans"].append(
            {
                **revision_stamp(row),
                "aggregate_version": type(row.plan).objects.get(id=row.plan_id).version,
            }
        )
    for identifier in selection.follow_up_revision_ids:
        row = selected_row(
            FollowUpRevision.objects.filter(
                follow_up__organization_id=org, follow_up__patient=patient
            ).select_related("follow_up"),
            identifier,
        )
        parent = type(row.follow_up).objects.select_for_update().get(id=row.follow_up_id)
        payload["follow_ups"].append({**revision_stamp(row), "snapshot": row.snapshot})
        manifest["follow_ups"].append({**revision_stamp(row), "aggregate_version": parent.version})
    for identifier in selection.document_version_ids:
        row = selected_row(
            DocumentVersion.objects.select_for_update()
            .filter(
                document__organization_id=org,
                document__patient=patient,
                document__purpose="clinical",
                scan_state="clean",
            )
            .select_related("document"),
            identifier,
        )
        item = {
            **revision_stamp(row),
            "label": row.document.label,
            "filename": row.filename,
            "content_type": row.content_type,
            "size": row.size,
        }
        payload["documents"].append(item)
        manifest["documents"].append(
            {"id": str(row.id), "version": row.version, "sha256": row.sha256}
        )
    if len(json.dumps(payload, ensure_ascii=False).encode()) > 65536:
        raise DomainError("TOO_LARGE", "Select fewer sources; the release must fit 64KiB.", 413)
    return {
        "payload": payload,
        "manifest": manifest,
        "digest": request_digest({"payload": payload, "manifest": manifest}),
    }


@transaction.atomic
def preview_release(user, org, patient_id, selection):
    patient = release_writer(user, org, patient_id)
    result = build_preview(user, org, patient, selection)
    audit(user, "portal.release.preview", org, patient_id)
    return result


@transaction.atomic
def publish_release(user, org, patient_id, selection, preview_digest, request_id):
    patient = release_writer(user, org, patient_id)
    values = {"patient": str(patient.id), "selection": selection, "digest": preview_digest}
    previous = replay_request(user, org, "portal.release", request_id, values)
    if previous:
        return PortalRelease.objects.get(id=previous)
    preview = build_preview(user, org, patient, selection)
    if preview["digest"] != preview_digest:
        raise DomainError(
            "CONFLICT", "Selected sources changed. Preview again before publishing.", 409
        )
    latest = (
        PortalRelease.objects.filter(patient=patient).aggregate(value=Max("sequence"))["value"] or 0
    )
    release = PortalRelease.objects.create(
        organization_id=org,
        patient=patient,
        author=user,
        sequence=latest + 1,
        payload=preview["payload"],
        manifest=preview["manifest"],
        digest=preview["digest"],
    )
    ReleaseDocument.objects.bulk_create(
        [
            ReleaseDocument(release=release, version_id=item["id"])
            for item in preview["payload"]["documents"]
        ]
    )
    ReleaseEvent.objects.create(release=release, actor=user, version=1, state="published")
    record_request_result(user, org, "portal.release", request_id, values, release.id)
    audit(user, "portal.release.published", org, release.id)
    return release


def release_state(release):
    return release.events.order_by("-version").first()


@transaction.atomic
def withdraw_release(user, org, release_id, expected_version, reason):
    initial = PortalRelease.objects.filter(id=release_id, organization_id=org).first()
    if initial is None:
        raise DomainError("NOT_FOUND", "Release is unavailable.", 404)
    release_writer(user, org, initial.patient_id)
    release = PortalRelease.objects.select_for_update().get(id=initial.id)
    state = release_state(release)
    check_version(state.version, expected_version)
    if (
        state.state != "published"
        or not isinstance(reason, str)
        or not 1 <= len(reason.strip()) <= 240
    ):
        raise DomainError("INVALID_INPUT", "Give a short reason to withdraw a published release.")
    ReleaseEvent.objects.create(
        release=release,
        actor=user,
        version=state.version + 1,
        state="withdrawn",
        reason=reason.strip(),
    )
    audit(user, "portal.release.withdrawn", org, release.id)
    return release
