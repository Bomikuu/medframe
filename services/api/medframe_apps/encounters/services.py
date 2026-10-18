"""One transaction and aggregate version for every clinical draft/finalization write."""

import hashlib
import json
from copy import deepcopy

from django.db import transaction
from django.db.models import OuterRef, Subquery
from django.utils import timezone
from pydantic import ValidationError

from config.errors import DomainError
from medframe_apps.auditing.models import Notification
from medframe_apps.auditing.services import audit
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.dental.models import DentalChartRevision, ToothFinding
from medframe_apps.encounters.inputs import DraftInput
from medframe_apps.encounters.models import (
    ClinicalNote,
    Diagnosis,
    Encounter,
    EncounterDraft,
    EncounterRevision,
    Observation,
)
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.services import record_event, require_patient, scoped_patients
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.treatments.models import Procedure


def validated_draft(content):
    try:
        return DraftInput.model_validate(content).model_dump(mode="json", exclude_none=True)
    except (ValidationError, ValueError):
        raise DomainError(
            "INVALID_INPUT",
            "Check SOAP, diagnoses, tooth surfaces, procedures, and the combined draft size.",
        ) from None


def require_encounter(user, organization_id, encounter_id, *, write=False):
    if write:
        require_membership(user, organization_id, "encounters.write")
    allowed = scoped_patients(
        user, organization_id, "patients.clinical.write" if write else "patients.clinical.read"
    )
    selector = (
        Encounter.objects.filter(
            id=encounter_id, organization_id=organization_id, patient_id__in=allowed.values("id")
        )
        .values("patient_id")
        .first()
    )
    if selector is None:
        raise DomainError(
            "NOT_FOUND", "Consultation is unavailable or you do not have access.", 404
        )
    require_patient(
        user,
        organization_id,
        selector["patient_id"],
        "patients.clinical.write" if write else "patients.clinical.read",
        lock=write,
    )
    queryset = Encounter.objects.select_related(
        "patient", "provider__membership__user", "branch", "draft__updated_by"
    )
    if write:
        queryset = queryset.select_for_update(of=("self",))
    encounter = queryset.get(id=encounter_id)
    return encounter


@transaction.atomic
def create_encounter(user, organization_id, patient_id, provider_id, branch_id, reason, request_id):
    require_membership(user, organization_id, "encounters.write")
    patient = require_patient(
        user, organization_id, patient_id, "patients.clinical.write", lock=True
    )
    if (
        not isinstance(reason, str)
        or not 1 <= len(reason.strip()) <= 240
        or patient.branch_id != branch_id
    ):
        raise DomainError(
            "INVALID_INPUT",
            "Choose the patient's branch and enter a reason of up to 240 characters.",
        )
    provider = ProviderProfile.objects.filter(
        id=provider_id,
        membership__user=user,
        membership__organization_id=organization_id,
        membership__active=True,
        membership__user__is_active=True,
    ).first()
    if provider is None or (
        provider.membership.branch_id and provider.membership.branch_id != branch_id
    ):
        raise DomainError(
            "FORBIDDEN", "Choose your active provider profile in this clinic and branch.", 403
        )
    digest = hashlib.sha256(
        json.dumps([str(patient_id), str(provider_id), str(branch_id), reason.strip()]).encode()
    ).hexdigest()
    advisory_lock(f"encounter:{organization_id}:{user.id}:{request_id}")
    existing = Encounter.objects.filter(
        organization_id=organization_id, created_by=user, request_id=request_id
    ).first()
    if existing:
        if existing.request_digest != digest:
            raise DomainError(
                "CONFLICT",
                "This consultation request was already used with different details.",
                409,
            )
        return require_encounter(user, organization_id, existing.id, write=True)
    encounter = Encounter.objects.create(
        organization_id=organization_id,
        patient=patient,
        provider=provider,
        branch_id=branch_id,
        created_by=user,
        reason=reason.strip(),
        request_id=request_id,
        request_digest=digest,
    )
    EncounterDraft.objects.create(encounter=encounter, content=validated_draft({}), updated_by=user)
    record_event(user, patient, "encounter.created")
    return encounter


def editable(encounter):
    draft = encounter.draft
    if encounter.status == "finalized":
        return draft.is_amendment and draft.amendment_state in {"draft", "in_progress"}
    return encounter.status in {"draft", "in_progress"}


@transaction.atomic
def save_encounter_draft(user, organization_id, encounter_id, content, expected_version):
    encounter = require_encounter(user, organization_id, encounter_id, write=True)
    check_version(encounter.version, expected_version)
    if not editable(encounter):
        raise DomainError(
            "IMMUTABLE",
            "Reopen a completed draft or start an amendment to change finalized care.",
            409,
        )
    content = validated_draft(content)
    if content["document_ids"]:
        from medframe_apps.documents.services import validate_encounter_documents

        validate_encounter_documents(user, encounter, content["document_ids"], clean=False)
    draft = encounter.draft
    draft.content = content
    draft.updated_by = user
    draft.save()
    encounter.version += 1
    encounter.updated_at = timezone.now()
    encounter.save(update_fields=["version", "updated_at"])
    audit(user, "encounter.draft.saved", organization_id, encounter.id)
    return encounter


@transaction.atomic
def transition_encounter(user, organization_id, encounter_id, target_status, expected_version):
    encounter = require_encounter(user, organization_id, encounter_id, write=True)
    check_version(encounter.version, expected_version)
    draft = encounter.draft
    current = (
        draft.amendment_state
        if encounter.status == "finalized" and draft.is_amendment
        else encounter.status
    )
    transitions = {
        "draft": {"in_progress", "completed"},
        "in_progress": {"completed"},
        "completed": {"in_progress"},
    }
    if target_status not in transitions.get(current, set()):
        raise DomainError("INVALID_TRANSITION", "Choose an allowed consultation state.", 409)
    if encounter.status == "finalized":
        if not draft.is_amendment:
            raise DomainError("IMMUTABLE", "Start an amendment to change finalized care.", 409)
        draft.amendment_state = target_status
        draft.updated_by = user
        draft.save()
    else:
        encounter.status = target_status
    encounter.version += 1
    encounter.updated_at = timezone.now()
    encounter.save()
    audit(user, "encounter." + target_status, organization_id, encounter.id)
    return encounter


def latest_patient_revisions(patient_id, *, exclude_encounter=None):
    latest = (
        EncounterRevision.objects.filter(encounter_id=OuterRef("encounter_id"))
        .order_by("-version")
        .values("id")[:1]
    )
    queryset = EncounterRevision.objects.filter(patient_id=patient_id, id=Subquery(latest))
    if exclude_encounter:
        queryset = queryset.exclude(encounter_id=exclude_encounter)
    return queryset.order_by("created_at", "id")


def chart_projection(patient_id, *, encounter=None, draft_content=None):
    by_key = {}
    for revision in latest_patient_revisions(
        patient_id, exclude_encounter=encounter.id if encounter else None
    ).only("content"):
        for finding in revision.content.get("findings", []):
            by_key[finding["key"]] = {**finding, "encounter_id": str(revision.encounter_id)}
    if draft_content:
        for finding in draft_content["findings"]:
            by_key[finding["key"]] = {**finding, "encounter_id": str(encounter.id)}
    # Current chart is a bounded summary. Complete evidence remains in exact visit revisions.
    counts = {}
    summary = []
    for finding in reversed(list(by_key.values())):
        tooth = finding["tooth"]
        if counts.get(tooth, 0) < 5:
            summary.append(finding)
            counts[tooth] = counts.get(tooth, 0) + 1
    return summary


@transaction.atomic
def finalize_encounter(user, organization_id, encounter_id, expected_version):
    encounter = require_encounter(user, organization_id, encounter_id, write=True)
    check_version(encounter.version, expected_version)
    draft = encounter.draft
    if (draft.amendment_state if draft.is_amendment else encounter.status) != "completed":
        raise DomainError(
            "REVIEW_REQUIRED",
            "Mark the consultation completed and review it before finalizing.",
            409,
        )
    if encounter.status == "finalized" and not draft.is_amendment:
        raise DomainError("IMMUTABLE", "This consultation is already finalized.", 409)
    require_membership(encounter.provider.membership.user, organization_id, "encounters.write")
    require_patient(
        encounter.provider.membership.user,
        organization_id,
        encounter.patient_id,
        "patients.clinical.read",
    )
    if not encounter.provider.membership.active or not encounter.provider.membership.user.is_active:
        raise DomainError("INVALID_PROVIDER", "The responsible provider is no longer active.")
    content = validated_draft(draft.content)
    if not any(content["soap"].values()) and not any(
        content[key] for key in ("diagnoses", "observations", "findings", "procedures")
    ):
        raise DomainError("EMPTY_RECORD", "Document the consultation before finalizing.")
    if content["document_ids"]:
        from medframe_apps.documents.services import validate_encounter_documents

        validate_encounter_documents(user, encounter, content["document_ids"], clean=True)
    latest = encounter.revisions.order_by("-version").first()
    if draft.is_amendment:
        check_version(latest.version, draft.base_revision_version)
    version = latest.version + 1 if latest else 1
    chart = chart_projection(encounter.patient_id, encounter=encounter, draft_content=content)
    snapshot = deepcopy(content)
    from medframe_apps.patients.models import PatientClinicalRevision

    history = (
        PatientClinicalRevision.objects.filter(patient_id=encounter.patient_id)
        .order_by("-version")
        .first()
    )
    snapshot["context"] = {
        "history_revision_id": str(history.id) if history else None,
        "reason": encounter.reason,
        "provider_name": encounter.provider.membership.user.display_name,
        "provider_id": str(encounter.provider_id),
        "branch_name": encounter.branch.name,
    }
    snapshot["context"]["template_revision_id"] = (
        str(draft.template_revision_id) if draft.template_revision_id else None
    )
    revision = EncounterRevision.objects.create(
        encounter=encounter,
        organization_id=organization_id,
        patient_id=encounter.patient_id,
        version=version,
        author=user,
        content=snapshot,
        amendment_reason=draft.amendment_reason if draft.is_amendment else "",
        chart=chart,
    )
    Diagnosis.objects.bulk_create(
        [Diagnosis(revision=revision, **value) for value in content["diagnoses"]]
    )
    ClinicalNote.objects.bulk_create(
        [
            ClinicalNote(revision=revision, section=key, text=value)
            for key, value in content["soap"].items()
            if value
        ]
    )
    Observation.objects.bulk_create(
        [Observation(revision=revision, **value) for value in content["observations"]]
    )
    ToothFinding.objects.bulk_create(
        [
            ToothFinding(
                revision=revision,
                finding_key=value["key"],
                # The normalized index owns clinical fields. Exact JSON content/chart
                # snapshots retain optional versioned 3D presentation anchors.
                **{key: item for key, item in value.items() if key not in {"key", "anchor"}},
            )
            for value in content["findings"]
        ]
    )
    Procedure.objects.bulk_create(
        [Procedure(revision=revision, **value) for value in content["procedures"]]
    )
    DentalChartRevision.objects.create(revision=revision, findings=chart)
    encounter.status = "finalized"
    encounter.version += 1
    encounter.updated_at = timezone.now()
    encounter.save()
    draft.is_amendment = False
    draft.amendment_state = "finalized"
    draft.save()
    event = record_event(
        user, encounter.patient, "encounter.amended" if version > 1 else "encounter.finalized"
    )
    # A separate event link preserves the exact encounter revision rather than today's projection.
    from medframe_apps.encounters.models import EncounterTimelineLink

    EncounterTimelineLink.objects.create(event=event, revision=revision)
    Notification.objects.create(
        user=user,
        organization_id=organization_id,
        kind="encounter_finalized",
        resource_id=revision.id,
    )
    return revision


@transaction.atomic
def create_encounter_amendment(
    user, organization_id, encounter_id, reason, expected_finalized_version
):
    encounter = require_encounter(user, organization_id, encounter_id, write=True)
    if (
        encounter.status != "finalized"
        or not isinstance(reason, str)
        or not 1 <= len(reason.strip()) <= 500
    ):
        raise DomainError(
            "INVALID_INPUT", "A finalized consultation and an amendment reason are required."
        )
    latest = encounter.revisions.order_by("-version").first()
    check_version(latest.version, expected_finalized_version)
    draft = encounter.draft
    if draft.is_amendment:
        if (
            draft.base_revision_version == latest.version
            and draft.amendment_reason == reason.strip()
        ):
            return encounter
        raise DomainError("CONFLICT", "An amendment draft already exists. Review it first.", 409)
    draft.content = {
        key: value for key, value in latest.content.items() if key in DraftInput.model_fields
    }
    draft.amendment_reason = reason.strip()
    draft.base_revision_version = latest.version
    draft.is_amendment = True
    draft.amendment_state = "draft"
    draft.updated_by = user
    draft.save()
    encounter.version += 1
    encounter.save(update_fields=["version"])
    audit(user, "encounter.amendment.started", organization_id, encounter.id)
    return encounter


@transaction.atomic
def read_dental_chart(user, organization_id, patient_id, encounter_id=None, revision_id=None):
    require_patient(user, organization_id, patient_id, "patients.clinical.read")
    if encounter_id and revision_id:
        raise DomainError("INVALID_INPUT", "Choose a draft or an exact finalized revision.")
    if revision_id:
        revision = EncounterRevision.objects.filter(
            id=revision_id, organization_id=organization_id, patient_id=patient_id
        ).first()
        if revision is None:
            raise DomainError("NOT_FOUND", "Chart revision is unavailable.", 404)
        result = revision.chart
    elif encounter_id:
        encounter = require_encounter(user, organization_id, encounter_id)
        if encounter.patient_id != patient_id:
            raise DomainError("NOT_FOUND", "Chart is unavailable.", 404)
        result = chart_projection(
            patient_id, encounter=encounter, draft_content=encounter.draft.content
        )
    else:
        result = chart_projection(patient_id)
    audit(user, "dental.chart.read", organization_id, patient_id)
    return result
