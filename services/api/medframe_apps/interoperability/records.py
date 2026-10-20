"""Only allowlisted fields from one immutable revision enter the local attachment."""

from pydantic import ValidationError

from config.errors import DomainError
from medframe_apps.encounters.models import EncounterRevision
from medframe_apps.encounters.services import require_encounter
from medframe_apps.expansion_policy import require_native_staff
from medframe_apps.interoperability.schema import ClinicalExport
from medframe_apps.organizations.policy import require_membership

MAX_BYTES = 5 * 1024 * 1024


def export_record(request, selection, generated_at):
    require_native_staff(request)
    require_membership(request.user, selection.organization_id, "encounters.write")
    require_membership(request.user, selection.organization_id, "documents.write")
    encounter = require_encounter(request.user, selection.organization_id, selection.encounter_id)
    revision = EncounterRevision.objects.filter(
        id=selection.revision_id,
        encounter=encounter,
        organization_id=selection.organization_id,
        patient_id=encounter.patient_id,
    ).first()
    if revision is None:
        raise DomainError("NOT_FOUND", "Choose a preserved consultation revision.", 404)
    content = revision.content
    try:
        sections = {}
        for key in selection.sections:
            if key == "dental":
                sections[key] = {"findings": content["findings"], "chart": revision.chart}
            else:
                sections[key] = content["anatomy_findings" if key == "anatomy" else key]
        context = content["context"]
        envelope = ClinicalExport.model_validate(
            {
                "generated_at": generated_at,
                "source": {
                    "organization_id": encounter.organization_id,
                    "branch_id": encounter.branch_id,
                    "branch_name_at_finalization": context["branch_name"],
                },
                "patient": {
                    "id": encounter.patient_id,
                    "clinic_reference": encounter.patient.reference,
                    "name_at_export": encounter.patient.full_name,
                },
                "revision": {
                    "encounter_id": encounter.id,
                    "id": revision.id,
                    "version": revision.version,
                    "finalized_at": revision.created_at,
                    "author_id": revision.author_id,
                    "provider_name_at_finalization": context["provider_name"],
                    "provider_specialty_at_finalization": context["provider_specialty"],
                },
                "sections": sections,
            }
        )
        body = envelope.model_dump_json(exclude_none=True).encode()
    except (ValidationError, TypeError, KeyError, ValueError):
        raise DomainError(
            "UNMAPPABLE_RECORD", "A selected section cannot be exported faithfully.", 409
        ) from None
    if len(body) > MAX_BYTES:
        raise DomainError("TOO_LARGE", "This export exceeds the 5MiB local download limit.", 413)
    return envelope, body
