from django.db import transaction
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.auditing.models import Notification
from medframe_apps.billing.policy import get_invoice, staff_member
from medframe_apps.communications.models import Reminder
from medframe_apps.communications.policy import scoped_reminders
from medframe_apps.documents.services import require_document
from medframe_apps.encounters.models import EncounterRevision
from medframe_apps.patients.services import require_patient
from medframe_apps.portal.policy import require_portal_link
from medframe_apps.record_filters import page_records


def target(request, row):
    try:
        if row.kind == "billing_updated":
            get_invoice(staff_member(request, row.organization_id), row.resource_id)
            return f"/clinic/billing/{row.resource_id}?organization={row.organization_id}"
        if row.kind == "patient_reminder":
            reminder = Reminder.objects.filter(
                id=row.resource_id, organization_id=row.organization_id
            ).first()
            if reminder is None:
                return None
            member = staff_member(request, row.organization_id, "communications.manage")
            if not scoped_reminders(member).filter(id=reminder.id).exists():
                return None
            return f"/clinic/communications?organization={row.organization_id}"
        if row.kind.startswith("document_"):
            version = require_document(request.user, row.organization_id, row.resource_id)
            if version.document.patient_id:
                return (
                    f"/clinic/patients/{version.document.patient_id}"
                    f"?organization={row.organization_id}&tab=documents"
                )
        if row.kind == "encounter_finalized":
            revision = (
                EncounterRevision.objects.select_related("encounter")
                .filter(id=row.resource_id, encounter__organization_id=row.organization_id)
                .first()
            )
            if revision:
                require_patient(
                    request.user,
                    row.organization_id,
                    revision.encounter.patient_id,
                    "patients.clinical.read",
                )
                return (
                    f"/clinic/consultations/{revision.encounter_id}"
                    f"?organization={row.organization_id}"
                )
    except DomainError:
        return None
    return None


def notification_page(request, organization_id, unread=False, after=None):
    staff_member(request, organization_id, "workspace.read")
    query = Notification.objects.filter(user=request.user, organization_id=organization_id).exclude(
        kind="patient_reminder"
    )
    count = query.filter(read_at__isnull=True).count()
    if unread:
        query = query.filter(read_at__isnull=True)
    result = page_records(
        query,
        scope=f"notifications:{request.user.id}:{organization_id}:{unread}",
        after=after,
        serialize=lambda row: {
            "id": str(row.id),
            "kind": row.kind,
            "read": row.read_at is not None,
            "created_at": row.created_at.isoformat(),
            "href": target(request, row),
        },
    )
    result["unread_count"] = count
    return result


def patient_notifications(request, link_id, after=None):
    link = require_portal_link(request, link_id)
    sources = Reminder.objects.filter(
        organization_id=link.organization_id, patient_id=link.patient_id
    ).values("id")
    query = Notification.objects.filter(
        user=request.user,
        organization_id=link.organization_id,
        kind="patient_reminder",
        resource_id__in=sources,
    )
    return page_records(
        query,
        scope=f"portal-notifications:{link.id}:{request.user.id}",
        after=after,
        serialize=lambda row: {
            "id": str(row.id),
            "kind": "Clinic reminder",
            "created_at": row.created_at.isoformat(),
            "read": row.read_at is not None,
        },
    )


@transaction.atomic
def read_patient_notifications(request, link_id, ids):
    link = require_portal_link(request, link_id)
    if len(ids) > 30:
        raise DomainError("INVALID_INPUT", "Choose at most 30 notifications.")
    sources = Reminder.objects.filter(
        organization_id=link.organization_id, patient_id=link.patient_id
    ).values("id")
    Notification.objects.filter(
        id__in=ids,
        user=request.user,
        organization_id=link.organization_id,
        kind="patient_reminder",
        resource_id__in=sources,
    ).update(read_at=timezone.now())
    return True
