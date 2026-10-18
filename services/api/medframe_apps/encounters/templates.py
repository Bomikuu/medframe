from typing import Literal
from uuid import UUID

from django.db import transaction
from pydantic import Field, ValidationError

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version
from medframe_apps.encounters.inputs import Input
from medframe_apps.encounters.models import (
    ConsultationTemplate,
    TemplateApplication,
    TemplateRevision,
)
from medframe_apps.encounters.services import editable, require_encounter
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.organizations.policy import require_membership


class Prompts(Input):
    subjective: str = Field(default="", max_length=1000)
    objective: str = Field(default="", max_length=1000)
    assessment: str = Field(default="", max_length=1000)
    plan: str = Field(default="", max_length=1000)


class TemplateInput(Input):
    id: UUID | None = None
    name: str = Field(min_length=1, max_length=120)
    specialty: Literal["general_medicine", "dentistry", "other"] = "other"
    prompts: Prompts = Field(default_factory=Prompts)
    observation_labels: list[str] = Field(default_factory=list, max_length=20)
    active: bool = True


def template_details(revision):
    return {
        "id": str(revision.template_id),
        "revision_id": str(revision.id),
        "version": revision.version,
        "definition": revision.definition,
        **revision.definition,
        "active": revision.template.active,
        "created_at": revision.created_at.isoformat(),
    }


@transaction.atomic
def save_template(user, organization_id, data, expected_version, request_id):
    require_membership(user, organization_id, "encounters.write")
    try:
        parsed = TemplateInput.model_validate(data)
        if any(not value.strip() or len(value) > 120 for value in parsed.observation_labels):
            raise ValueError()
    except (ValidationError, ValueError):
        raise DomainError(
            "INVALID_INPUT",
            "Use a name, four prompts up to 1,000 characters, and up to 20 observation labels.",
        ) from None
    request_data = {"data": parsed.model_dump(mode="json"), "version": expected_version}
    replay = replay_request(user, organization_id, "template.save", request_id, request_data)
    if replay:
        return ConsultationTemplate.objects.get(id=replay, organization_id=organization_id)
    if parsed.id:
        template = (
            ConsultationTemplate.objects.select_for_update()
            .filter(id=parsed.id, organization_id=organization_id)
            .first()
        )
        if template is None:
            raise DomainError("NOT_FOUND", "Template is unavailable.", 404)
        check_version(template.version, expected_version)
        template.name, template.specialty, template.active = (
            parsed.name,
            parsed.specialty,
            parsed.active,
        )
        template.version += 1
        template.save()
    else:
        check_version(0, expected_version)
        template = ConsultationTemplate.objects.create(
            organization_id=organization_id,
            created_by=user,
            name=parsed.name,
            specialty=parsed.specialty,
            active=parsed.active,
        )
    TemplateRevision.objects.create(
        template=template,
        organization_id=organization_id,
        author=user,
        version=template.version,
        definition=parsed.model_dump(mode="json", exclude={"id", "active"}),
    )
    record_request_result(
        user, organization_id, "template.save", request_id, request_data, template.id
    )
    audit(user, "template.saved", organization_id, template.id)
    return template


@transaction.atomic
def apply_template(
    user, organization_id, encounter_id, template_revision_id, expected_version, request_id
):
    encounter = require_encounter(user, organization_id, encounter_id, write=True)
    values = {
        "encounter": str(encounter_id),
        "template_revision": str(template_revision_id),
        "version": expected_version,
    }
    if replay_request(user, organization_id, "template.apply", request_id, values):
        return encounter
    check_version(encounter.version, expected_version)
    if not editable(encounter):
        raise DomainError("IMMUTABLE", "Reopen this draft before applying guidance.", 409)
    revision = (
        TemplateRevision.objects.select_related("template")
        .filter(id=template_revision_id, organization_id=organization_id, template__active=True)
        .first()
    )
    if revision is None:
        raise DomainError("NOT_FOUND", "Active clinic template is unavailable.", 404)
    encounter.draft.template_revision = revision
    encounter.draft.updated_by = user
    encounter.draft.save(update_fields=["template_revision", "updated_by"])
    encounter.version += 1
    encounter.save(update_fields=["version", "updated_at"])
    TemplateApplication.objects.create(
        encounter=encounter,
        organization_id=organization_id,
        revision=revision,
        author=user,
        encounter_version=encounter.version,
    )
    record_request_result(user, organization_id, "template.apply", request_id, values, encounter.id)
    audit(user, "template.applied", organization_id, encounter.id)
    return encounter
