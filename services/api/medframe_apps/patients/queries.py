from django.db import transaction

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.models import PatientEvent
from medframe_apps.patients.services import require_patient
from medframe_apps.record_filters import filter_dates, page_records, parse_filters


@transaction.atomic
def list_patient_events(user, organization_id, patient_id, filters=None, after=None, first=20):
    require_patient(user, organization_id, patient_id, "patients.clinical.read")
    member = require_membership(user, organization_id, "patients.clinical.read")
    parsed = parse_filters(filters)
    if parsed.status or parsed.tooth:
        raise DomainError("INVALID_INPUT", "Choose valid history filters.")
    query = PatientEvent.objects.filter(
        organization_id=organization_id, patient_id=patient_id
    ).select_related("actor", "encountertimelinelink__revision")
    if parsed.type:
        if parsed.type not in {
            "registered",
            "clinical.updated",
            "demographics.updated",
            "encounter.created",
            "encounter.finalized",
            "encounter.amended",
            "access.granted",
            "access.revoked",
        }:
            raise DomainError("INVALID_INPUT", "Choose a valid history event type.")
        query = query.filter(action=parsed.type)
    if parsed.query:
        query = query.filter(action__icontains=parsed.query)
    if parsed.author_id:
        query = query.filter(actor_id=parsed.author_id)
    query = filter_dates(query, parsed, member.organization.timezone)

    def serialize(item):
        link = getattr(item, "encountertimelinelink", None)
        return {
            "id": str(item.id),
            "action": item.action,
            "created_at": item.created_at.isoformat(),
            "author_name": item.actor.display_name,
            "revision_id": str(item.revision_id) if item.revision_id else None,
            "encounter_id": str(link.revision.encounter_id) if link else None,
            "encounter_revision_id": str(link.revision_id) if link else None,
        }

    audit(user, "patient.history.filtered", organization_id, patient_id)
    return page_records(
        query,
        scope=f"history:{organization_id}:{patient_id}:{user.id}",
        filters=parsed,
        after=after,
        first=first,
        serialize=serialize,
    )
