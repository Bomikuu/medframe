"""Patient task facts only; unpublished clinical work is never part of this projection."""

from zoneinfo import ZoneInfo

from django.db.models import Q
from django.utils import timezone

from medframe_apps.billing.calculations import amount_text
from medframe_apps.billing.installment_projection import financial_due_snapshot
from medframe_apps.billing.models import Invoice
from medframe_apps.operations.models import Appointment
from medframe_apps.operations.serializers import appointment_details, patient_operations
from medframe_apps.portal.policy import require_portal_link


def patient_task_home(request, link_id):
    link = require_portal_link(request, link_id)
    now = timezone.now()
    today = now.astimezone(ZoneInfo(link.organization.timezone)).date()
    appointment = (
        Appointment.objects.filter(
            organization=link.organization,
            patient=link.patient,
            status__in=["booked", "checked_in", "in_service"],
        )
        .filter(
            Q(end__gte=now)
            | Q(online_room__timing_mode="instant", online_room__ended_at__isnull=True)
        )
        .select_related("provider__membership__user", "branch", "resource", "online_room")
        .order_by("start", "id")
        .first()
    )
    operations = patient_operations(request, link_id, now=now)
    balances = financial_due_snapshot(
        Invoice.objects.filter(
            organization=link.organization, patient=link.patient, state="issued"
        ),
        today,
    )
    return {
        "as_of": now.isoformat(),
        "timezone": link.organization.timezone,
        "next_appointment": appointment_details(appointment, portal=True) if appointment else None,
        "tickets": operations["tickets"],
        "balances": [
            {
                "currency": currency,
                **{
                    key: amount_text(value[key])
                    for key in ["outstanding", "due_now", "overdue", "future"]
                },
            }
            for currency, value in sorted(balances.items())
        ],
    }
