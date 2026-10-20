import hashlib
from datetime import timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.billing.invoices import validate_input
from medframe_apps.common import check_version
from medframe_apps.communications.inputs import DeliveryActionInput, ReminderInput
from medframe_apps.communications.models import (
    CommunicationPreference,
    Delivery,
    DeliveryEvent,
    Reminder,
)
from medframe_apps.communications.policy import (
    communication_member,
    communication_patient,
    scoped_reminders,
    source_active,
    source_record,
)
from medframe_apps.idempotency import record_request_result, replay_request

PURPOSE = {"appointment": "appointments", "follow_up": "follow_ups", "invoice": "billing"}


def safe_message(source, kind, zone, obligation=None):
    if kind == "appointment":
        moment = source.start.astimezone(ZoneInfo(zone)).strftime("%d %b %Y, %I:%M %p")
        return (
            f"Medframe: Your clinic appointment is on {moment} ({zone}). "
            "Contact your clinic for changes."
        )
    if kind == "follow_up":
        return (
            "Medframe: Please contact your clinic about a follow-up. "
            "Sign in to your patient portal for shared information."
        )
    if obligation:
        from medframe_apps.billing.calculations import amount_text

        return (
            f"Medframe: Installment of PHP {amount_text(obligation['amount'])} "
            f"scheduled for {obligation['date']}. "
            "Sign in to your patient portal for your statement."
        )
    return (
        "Medframe: A billing update is available. "
        "Sign in to your patient portal or contact your clinic."
    )


def eligible_preference(patient_id, kind, channel):
    row = CommunicationPreference.objects.filter(patient_id=patient_id).first()
    if row is None or not getattr(row, PURPOSE[kind]) or not getattr(row, f"{channel}_enabled"):
        raise DomainError(
            "CONSENT_REQUIRED",
            "Confirm the recipient and opt-in for this reminder purpose/channel.",
            409,
        )
    return row


def create_reminder(request, member, parsed, *, automatic=False):
    communication_patient(member, parsed.branch_id, parsed.patient_id)
    now = timezone.now()
    if timezone.is_naive(parsed.due_at) or not now < parsed.due_at <= now + timedelta(days=366):
        raise DomainError(
            "INVALID_INPUT", "Choose a future reminder time within one year, with timezone."
        )
    source = source_record(
        member.organization_id,
        parsed.branch_id,
        parsed.patient_id,
        parsed.source_kind,
        parsed.source_id,
    )
    if not source_active(source, parsed.source_kind):
        raise DomainError("CONFLICT", "This source no longer needs a reminder.", 409)
    from medframe_apps.communications.installments import reminder_obligation

    if parsed.source_kind == "invoice" and hasattr(source, "installment"):
        from medframe_apps.billing.policy import staff_member

        staff_member(request, member.organization_id, "billing.read")
    obligation = (
        reminder_obligation(source, parsed.obligation_id)
        if parsed.source_kind == "invoice"
        else None
    )
    if parsed.source_kind != "invoice" and parsed.obligation_id:
        raise DomainError("INVALID_INPUT", "Choose an installment only for an invoice.")
    preference = eligible_preference(parsed.patient_id, parsed.source_kind, parsed.channel)
    key = hashlib.sha256(
        f"{member.organization_id}:{source.id}:{parsed.source_kind}:{source.version}:{preference.version}:{parsed.channel}:{parsed.due_at.isoformat()}:{obligation}".encode()
    ).hexdigest()
    row, created = Reminder.objects.get_or_create(
        dedup_key=key,
        defaults={
            "organization_id": member.organization_id,
            "branch_id": parsed.branch_id,
            "patient_id": parsed.patient_id,
            "source_kind": parsed.source_kind,
            "source_id": source.id,
            "source_version": source.version,
            "preference_version": preference.version,
            "due_at": parsed.due_at,
            "channel": parsed.channel,
            "created_by": request.user,
            "automatic": automatic,
            "obligation_snapshot": obligation,
        },
    )
    if created:
        delivery = Delivery.objects.create(
            reminder=row,
            available_at=parsed.due_at,
            transport="twilio"
            if settings.SMS_LIVE_ENABLED and parsed.channel == "sms"
            else "in_app"
            if parsed.channel == "in_app"
            else "preview",
        )
        DeliveryEvent.objects.create(delivery=delivery, state="scheduled", actor=request.user)
    return row


@transaction.atomic
def reminder_action(request, organization_id, action, data, request_id):
    member = communication_member(request, organization_id)
    parsed = validate_input(ReminderInput if action == "schedule" else DeliveryActionInput, data)
    if action != "schedule":
        if not scoped_reminders(member).filter(id=parsed.id).exists():
            raise DomainError("NOT_FOUND", "This reminder is unavailable.", 404)
    else:
        communication_patient(member, parsed.branch_id, parsed.patient_id)
    input_data = parsed.model_dump(mode="json")
    previous = replay_request(
        request.user, organization_id, f"communications.{action}", request_id, input_data
    )
    if previous:
        row = scoped_reminders(member).get(id=previous)
        return {"id": str(row.id), "version": row.version}
    if action == "schedule":
        row = create_reminder(request, member, parsed)
    else:
        # Same order as the worker: lock delivery before changing reminder version.
        delivery = Delivery.objects.select_for_update().get(reminder_id=parsed.id)
        row = scoped_reminders(member).select_for_update().get(id=parsed.id)
        check_version(row.version, parsed.expected_version)
        if action == "cancel":
            if delivery.state not in {"scheduled", "retryable_failure", "permanent_failure"}:
                raise DomainError(
                    "CONFLICT",
                    "This message cannot be recalled. It may already be accepted or delivered.",
                    409,
                )
            delivery.state = "cancelled"
            delivery.cancelled_at = timezone.now()
        elif action == "retry":
            if delivery.state != "retryable_failure" or delivery.attempts >= 5:
                raise DomainError(
                    "CONFLICT", "Only a known pre-acceptance transient failure can be retried.", 409
                )
            eligible_preference(row.patient_id, row.source_kind, row.channel)
            delivery.available_at = timezone.now()
            delivery.state = "scheduled"
        else:
            raise DomainError("INVALID_INPUT", "Choose schedule, cancel or retry.")
        row.version += 1
        row.save(update_fields=["version"])
        delivery.save()
        DeliveryEvent.objects.create(delivery=delivery, state=delivery.state, actor=request.user)
    record_request_result(
        request.user, organization_id, f"communications.{action}", request_id, input_data, row.id
    )
    audit(request.user, f"communications.{action}", organization_id, row.id)
    return {"id": str(row.id), "version": row.version}
