from datetime import datetime, time, timedelta
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.communications.delivery import dispatch_due, preflight, transition
from medframe_apps.communications.inputs import ReminderInput
from medframe_apps.communications.models import CommunicationSettings, Delivery
from medframe_apps.communications.policy import communication_member
from medframe_apps.communications.reminders import create_reminder
from medframe_apps.operations.models import Appointment
from medframe_apps.treatments.models import FollowUp


@shared_task
def deliver_reminders():
    dispatch_due()


@shared_task
def schedule_automatic():
    now = timezone.now()
    with transaction.atomic():
        for delivery in (
            Delivery.objects.select_for_update(skip_locked=True, of=("self",))
            .filter(state__in=["scheduled", "retryable_failure"])
            .select_related("reminder__organization", "reminder__created_by")[:500]
        ):
            try:
                preflight(delivery.reminder)
            except DomainError:
                transition(delivery, "cancelled", "ELIGIBILITY_CHANGED")
    for config in (
        CommunicationSettings.objects.select_related("organization", "updated_by")
        .filter(organization__active=True, updated_by__isnull=False)
        .iterator(chunk_size=50)
    ):
        request = SimpleNamespace(
            user=config.updated_by, session={"mfa_verified": True, "auth_realm": "staff"}
        )
        try:
            member = communication_member(request, config.organization_id)
        except DomainError:
            continue
        zone = ZoneInfo(config.organization.timezone)
        candidates = []
        if config.appointment_automatic:
            appointments = Appointment.objects.filter(
                organization_id=config.organization_id,
                status="booked",
                start__gt=now + timedelta(hours=24),
                start__lte=now + timedelta(days=30),
            ).order_by("start")[:500]
            candidates.extend(
                (row, "appointment", row.branch_id, row.start - timedelta(hours=24))
                for row in appointments
            )
        if config.follow_up_automatic:
            follow_ups = (
                FollowUp.objects.select_related("patient")
                .filter(
                    organization_id=config.organization_id,
                    status="open",
                    due_date__gte=now.astimezone(zone).date(),
                    due_date__lte=(now + timedelta(days=30)).astimezone(zone).date(),
                )
                .order_by("due_date")[:500]
            )
            candidates.extend(
                (
                    row,
                    "follow_up",
                    row.patient.branch_id,
                    datetime.combine(row.due_date, time(9), zone),
                )
                for row in follow_ups
            )
        for source, kind, branch_id, due in candidates:
            if due <= now:
                continue
            for channel in ["sms", "in_app"]:
                try:
                    with transaction.atomic():
                        create_reminder(
                            request,
                            member,
                            ReminderInput(
                                branch_id=branch_id,
                                patient_id=source.patient_id,
                                source_kind=kind,
                                source_id=source.id,
                                channel=channel,
                                due_at=due,
                            ),
                            automatic=True,
                        )
                except DomainError:
                    continue
