from django.db import transaction

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.encounters.models import Encounter
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.services import require_patient, scoped_patients
from medframe_apps.record_filters import filter_dates, page_records, parse_filters


def encounter_summary(item):
    return {
        "id": str(item.id),
        "patient_id": str(item.patient_id),
        "patient_name": item.patient.full_name,
        "reason": item.reason,
        "status": item.status,
        "is_amendment": item.draft.is_amendment,
        "version": item.version,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
        "provider_name": item.provider.membership.user.display_name,
    }


@transaction.atomic
def list_encounters(user, organization_id, patient_id=None, filters=None, after=None, first=20):
    member = require_membership(user, organization_id, "patients.clinical.read")
    parsed = parse_filters(filters)
    if (
        parsed.status not in {None, "draft", "in_progress", "completed", "finalized", "amendment"}
        or parsed.type
    ):
        raise DomainError("INVALID_INPUT", "Choose a valid consultation status.")
    allowed = scoped_patients(user, organization_id, "patients.clinical.read")
    query = Encounter.objects.filter(
        organization_id=organization_id, patient_id__in=allowed.values("id")
    )
    if patient_id:
        require_patient(user, organization_id, patient_id, "patients.clinical.read")
        query = query.filter(patient_id=patient_id)
    if parsed.query:
        query = query.filter(reason__icontains=parsed.query)
    if parsed.status == "amendment":
        query = query.filter(draft__is_amendment=True)
    elif parsed.status:
        query = query.filter(status=parsed.status)
        if parsed.status == "draft":
            query = query.filter(draft__is_amendment=False)
    if parsed.author_id:
        query = query.filter(provider__membership__user_id=parsed.author_id)
    if parsed.tooth:
        from medframe_apps.dental.reference import TEETH

        if parsed.tooth not in TEETH:
            raise DomainError("INVALID_INPUT", "Choose a valid FDI tooth.")
        query = query.filter(revisions__toothfinding__tooth=parsed.tooth).distinct()
    query = filter_dates(query, parsed, member.organization.timezone)
    audit(user, "encounters.filtered", organization_id, patient_id)
    return page_records(
        query.select_related("patient", "draft", "provider__membership__user"),
        scope=f"encounters:{organization_id}:{patient_id}:{user.id}",
        filters=parsed,
        after=after,
        first=first,
        serialize=encounter_summary,
    )
