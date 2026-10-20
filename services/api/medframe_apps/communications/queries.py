from zoneinfo import ZoneInfo

from django.conf import settings
from django.db.models import Q

from config.crypto import cipher
from config.errors import DomainError
from medframe_apps.billing.installment_projection import invoice_due_projection, serialize_due
from medframe_apps.communications.models import CommunicationPreference, CommunicationSettings
from medframe_apps.communications.policy import (
    communication_member,
    communication_patient,
    scoped_reminders,
    source_record,
)
from medframe_apps.communications.preferences import preference_details
from medframe_apps.communications.reminders import safe_message
from medframe_apps.organizations.policy import permissions_for
from medframe_apps.portal.models import PortalLink
from medframe_apps.record_filters import page_records, parse_filters


def communication_setup(request, organization_id, branch_id, patient_id=None, search=""):
    member = communication_member(request, organization_id)
    from medframe_apps.billing.policy import scoped_branches

    if not scoped_branches(member).filter(id=branch_id).exists():
        raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
    config = CommunicationSettings.objects.filter(organization_id=organization_id).first()
    result = {
        "transport": "twilio" if settings.SMS_LIVE_ENABLED else "preview",
        "timezone": member.organization.timezone,
        "settings": {
            "appointment_automatic": config.appointment_automatic if config else False,
            "follow_up_automatic": config.follow_up_automatic if config else False,
            "version": config.version if config else 0,
        },
        "branches": [
            {"id": str(branch.id), "name": branch.name} for branch in scoped_branches(member)
        ],
        "patients": [],
        "can_configure": "organization.manage" in permissions_for(member),
    }
    from medframe_apps.patients.models import Patient

    patients = Patient.objects.filter(organization_id=organization_id, branch_id=branch_id)
    if search:
        patients = patients.filter(
            Q(full_name__icontains=str(search)[:160]) | Q(reference__icontains=str(search)[:160])
        )
    result["patients"] = [
        {"id": str(patient.id), "name": patient.full_name, "reference": patient.reference}
        for patient in patients.order_by("full_name")[:50]
    ]
    if patient_id:
        communication_patient(member, branch_id, patient_id)
        result["preference"] = preference_details(
            CommunicationPreference.objects.filter(patient_id=patient_id).first()
        )
        result["recipients"] = [
            {
                "id": str(link.user_id),
                "name": link.user.display_name,
                "relationship": link.relationship,
            }
            for link in PortalLink.objects.filter(
                patient_id=patient_id,
                organization_id=organization_id,
                active=True,
                user__is_active=True,
            ).select_related("user")[:50]
        ]
        from medframe_apps.billing.models import Invoice
        from medframe_apps.billing.queries import annotated_invoices
        from medframe_apps.operations.models import Appointment
        from medframe_apps.treatments.models import FollowUp

        result["sources"] = (
            [
                {
                    "id": str(row.id),
                    "kind": "appointment",
                    "label": "Appointment · "
                    + row.start.astimezone(ZoneInfo(member.organization.timezone)).strftime(
                        "%d %b %Y %H:%M"
                    ),
                    "message": safe_message(row, "appointment", member.organization.timezone),
                }
                for row in Appointment.objects.filter(
                    organization_id=organization_id,
                    branch_id=branch_id,
                    patient_id=patient_id,
                    status="booked",
                ).order_by("start")[:50]
            ]
            + [
                {
                    "id": str(row.id),
                    "kind": "follow_up",
                    "label": "Follow-up · "
                    + (row.due_date.isoformat() if row.due_date else "No due date"),
                    "message": safe_message(row, "follow_up", member.organization.timezone),
                }
                for row in FollowUp.objects.filter(
                    organization_id=organization_id, patient_id=patient_id, status="open"
                ).order_by("due_date")[:50]
            ]
            + [
                {
                    "id": str(row.id),
                    "kind": "invoice",
                    "label": "Invoice · " + row.number,
                    "installments": serialize_due(invoice_due_projection(row))["rows"]
                    if hasattr(row, "installment") and "billing.read" in permissions_for(member)
                    else [],
                    "message": safe_message(row, "invoice", member.organization.timezone),
                }
                for row in annotated_invoices(
                    Invoice.objects.filter(
                        organization_id=organization_id,
                        branch_id=branch_id,
                        patient_id=patient_id,
                        state="issued",
                    )
                )
                .filter(balance_amount__gt=0)
                .order_by("-created_at")[:50]
            ]
        )
    return result


def reminder_summary(row):
    delivery = row.delivery
    try:
        source = source_record(
            row.organization_id, row.branch_id, row.patient_id, row.source_kind, row.source_id
        )
        body = safe_message(
            source, row.source_kind, row.organization.timezone, row.obligation_snapshot
        )
    except DomainError:
        body = "Source unavailable. This reminder will not be dispatched."
    if delivery.encrypted_body:
        body = cipher().decrypt(delivery.encrypted_body.encode()).decode()
    return {
        "id": str(row.id),
        "patient_id": str(row.patient_id),
        "patient_name": row.patient.full_name,
        "source_kind": row.source_kind,
        "source_id": str(row.source_id),
        "channel": row.channel,
        "due_at": row.due_at.isoformat(),
        "state": delivery.state,
        "transport": delivery.transport,
        "attempts": delivery.attempts,
        "error_code": delivery.error_code,
        "version": row.version,
        "message": body,
        "automatic": row.automatic,
        "created_at": row.created_at.isoformat(),
        "events": [
            {"state": event.state, "code": event.code, "created_at": event.created_at.isoformat()}
            for event in delivery.events.order_by("created_at")[:20]
        ],
    }


def communication_page(request, organization_id, branch_id, filters=None, after=None):
    member = communication_member(request, organization_id)
    from medframe_apps.billing.policy import scoped_branches

    if not scoped_branches(member).filter(id=branch_id).exists():
        raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
    criteria = parse_filters(filters)
    query = scoped_reminders(member).filter(branch_id=branch_id)
    if criteria.query:
        query = query.filter(
            Q(patient__full_name__icontains=criteria.query)
            | Q(patient__reference__icontains=criteria.query)
        )
    if criteria.status:
        query = query.filter(delivery__state=criteria.status)
    return page_records(
        query.select_related("delivery", "patient", "organization"),
        scope=f"communications:{organization_id}:{member.id}:{branch_id}",
        filters=criteria,
        after=after,
        serialize=reminder_summary,
    )
