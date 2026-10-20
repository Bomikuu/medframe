from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from config.crypto import cipher
from config.errors import DomainError
from medframe_apps.auditing.models import Notification
from medframe_apps.communications.models import Delivery, DeliveryEvent, Reminder
from medframe_apps.communications.policy import source_active, source_record
from medframe_apps.communications.providers import SendResult, send_sms
from medframe_apps.communications.reminders import eligible_preference, safe_message
from medframe_apps.organizations.policy import require_membership
from medframe_apps.portal.models import PortalLink


def transition(delivery, state, code=""):
    if delivery.state == state and delivery.error_code == code:
        return
    delivery.state = state
    delivery.error_code = code
    delivery.lease_until = None
    delivery.save()
    Reminder.objects.filter(id=delivery.reminder_id).update(version=F("version") + 1)
    DeliveryEvent.objects.create(delivery=delivery, state=state, code=code)


def preflight(reminder):
    member = require_membership(
        reminder.created_by, reminder.organization_id, "communications.manage"
    )
    if member.branch_id and member.branch_id != reminder.branch_id:
        raise DomainError("FORBIDDEN", "Source scope changed.", 403)
    source = source_record(
        reminder.organization_id,
        reminder.branch_id,
        reminder.patient_id,
        reminder.source_kind,
        reminder.source_id,
    )
    if source.version != reminder.source_version or not source_active(source, reminder.source_kind):
        raise DomainError("CONFLICT", "Source changed.", 409)
    preference = eligible_preference(reminder.patient_id, reminder.source_kind, reminder.channel)
    if preference.version != reminder.preference_version:
        raise DomainError("CONFLICT", "Recipient preference changed.", 409)
    if (
        preference.recipient_user_id
        and not PortalLink.objects.filter(
            organization_id=reminder.organization_id,
            patient_id=reminder.patient_id,
            user_id=preference.recipient_user_id,
            active=True,
            user__is_active=True,
        ).exists()
    ):
        raise DomainError("FORBIDDEN", "Recipient access changed.", 403)
    from medframe_apps.communications.installments import validate_snapshot

    if reminder.source_kind == "invoice":
        if reminder.obligation_snapshot:
            require_membership(reminder.created_by, reminder.organization_id, "billing.read")
        validate_snapshot(source, reminder.obligation_snapshot)
    return preference, safe_message(
        source, reminder.source_kind, reminder.organization.timezone, reminder.obligation_snapshot
    )


def callback_url(delivery):
    if not settings.TWILIO_STATUS_CALLBACK_URL:
        return ""
    token = signing.dumps(str(delivery.id), salt="sms-delivery:v1")
    return settings.TWILIO_STATUS_CALLBACK_URL + "?" + urlencode({"ticket": token})


def dispatch_due():
    # A crashed worker may already have submitted its message: never reclaim as a fresh send.
    with transaction.atomic():
        expired = Delivery.objects.select_for_update(skip_locked=True).filter(
            state="sending", lease_until__lt=timezone.now()
        )[:50]
        for delivery in expired:
            transition(delivery, "unknown", "LEASE_EXPIRED_RECONCILE")
    for _ in range(20):
        with transaction.atomic():
            delivery = (
                Delivery.objects.select_for_update(skip_locked=True)
                .filter(
                    state__in=["scheduled", "retryable_failure"],
                    attempts__lt=5,
                    available_at__lte=timezone.now(),
                    cancelled_at__isnull=True,
                )
                .order_by("available_at")
                .first()
            )
            if delivery is None:
                return
            reminder = Reminder.objects.select_related("organization", "created_by").get(
                id=delivery.reminder_id
            )
            try:
                preference, body = preflight(reminder)
            except DomainError:
                transition(delivery, "cancelled", "ELIGIBILITY_CHANGED")
                continue
            delivery.encrypted_body = cipher().encrypt(body.encode()).decode()
            delivery.state = "sending"
            delivery.attempts += 1
            delivery.lease_until = timezone.now() + timedelta(minutes=2)
            delivery.save()
            DeliveryEvent.objects.create(delivery=delivery, state="sending")
            if reminder.channel == "in_app":
                Notification.objects.create(
                    user_id=preference.recipient_user_id,
                    organization_id=reminder.organization_id,
                    kind="patient_reminder",
                    resource_id=reminder.id,
                )
                transition(delivery, "delivered")
                continue
            recipient = cipher().decrypt(preference.encrypted_recipient.encode()).decode()
            delivery_id = delivery.id
            transport = delivery.transport
            callback = callback_url(delivery)
        # Bounded network I/O deliberately occurs outside the transaction/row lock.
        result = (
            SendResult("preview", code="NOT_SENT")
            if transport == "preview"
            else send_sms(recipient, body, callback)
        )
        with transaction.atomic():
            delivery = Delivery.objects.select_for_update().get(id=delivery_id)
            # Signed callbacks can arrive before the provider HTTP response.
            if delivery.state in {"delivered", "permanent_failure"}:
                continue
            if result.provider_id:
                if delivery.provider_id and delivery.provider_id != result.provider_id:
                    transition(delivery, "unknown", "PROVIDER_REFERENCE_CONFLICT")
                    continue
                delivery.provider_id = result.provider_id
            state = result.state
            if state == "retryable_failure":
                if delivery.attempts >= 5:
                    state = "permanent_failure"
                else:
                    delivery.available_at = timezone.now() + timedelta(
                        seconds=min(3600, 30 * 2**delivery.attempts)
                    )
            transition(delivery, state, result.code)


@transaction.atomic
def provider_status(delivery_id, provider_id, status):
    delivery = (
        Delivery.objects.select_for_update().filter(id=delivery_id, transport="twilio").first()
    )
    if delivery is None or not provider_id or len(provider_id) > 80:
        raise DomainError("NOT_FOUND", "Delivery is unavailable.", 404)
    if delivery.provider_id and delivery.provider_id != provider_id:
        raise DomainError("FORBIDDEN", "Provider reference mismatch.", 403)
    if delivery.state not in {"sending", "unknown", "accepted", "delivered", "permanent_failure"}:
        return
    if delivery.state in {"delivered", "permanent_failure"}:
        return
    states = {
        "queued": "accepted",
        "accepted": "accepted",
        "sending": "accepted",
        "sent": "accepted",
        "delivered": "delivered",
        "undelivered": "permanent_failure",
        "failed": "permanent_failure",
    }
    state = states.get(status)
    if state:
        delivery.provider_id = provider_id
        transition(delivery, state, "PROVIDER_UNDELIVERED" if state == "permanent_failure" else "")
