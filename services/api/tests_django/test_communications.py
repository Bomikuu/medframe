from datetime import timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4
from zoneinfo import ZoneInfo

from django.core import signing
from django.db import DatabaseError, transaction
from django.test import RequestFactory, override_settings
from django.utils import timezone
from twilio.request_validator import RequestValidator

from config.errors import DomainError
from medframe_apps.auditing.models import Notification
from medframe_apps.auditing.notifications import notification_page
from medframe_apps.communications.actions import communication_action
from medframe_apps.communications.delivery import callback_url, dispatch_due, provider_status
from medframe_apps.communications.models import (
    CommunicationPreference,
    Delivery,
    DeliveryEvent,
    Reminder,
)
from medframe_apps.communications.preferences import revoke_preference
from medframe_apps.communications.providers import SendResult
from medframe_apps.communications.queries import communication_setup
from medframe_apps.communications.reminders import safe_message
from medframe_apps.communications.tasks import schedule_automatic
from medframe_apps.communications.views import sms_status
from medframe_apps.treatments.models import FollowUp
from tests_django.test_billing import BillingFixture


@override_settings(SMS_LIVE_ENABLED=False, TWILIO_STATUS_CALLBACK_URL="")
class CommunicationsTests(BillingFixture):
    def setUp(self):
        super().setUp()
        self.follow_up = FollowUp.objects.create(
            organization=self.organization,
            patient=self.patient,
            created_by=self.doctor,
            instructions="PRIVATE clinical instruction never in SMS",
            due_date=timezone.localdate() + timedelta(days=2),
        )

    def consent(self, **changes):
        return communication_action(
            self.request,
            self.organization.id,
            "preference",
            {
                "branch_id": str(self.branch.id),
                "patient_id": str(self.patient.id),
                "recipient": "+639001234567",
                "recipient_name": "Synthetic confirmed recipient",
                "sms_enabled": True,
                "follow_ups": True,
                "appointments": True,
                "billing": True,
                "confirmed": True,
                "expected_version": 0,
                **changes,
            },
            uuid4(),
        )

    def schedule(self, **changes):
        return communication_action(
            self.request,
            self.organization.id,
            "schedule",
            {
                "branch_id": str(self.branch.id),
                "patient_id": str(self.patient.id),
                "source_kind": "follow_up",
                "source_id": str(self.follow_up.id),
                "channel": "sms",
                "due_at": (timezone.now() + timedelta(minutes=1)).isoformat(),
                **changes,
            },
            uuid4(),
        )

    def run_due(self):
        with patch(
            "medframe_apps.communications.delivery.timezone.now",
            return_value=timezone.now() + timedelta(minutes=2),
        ):
            dispatch_due()

    def test_consent_is_explicit_and_invalid_phone_rejected(self):
        with self.assertRaises(DomainError):
            self.schedule()
        with self.assertRaises(DomainError):
            self.consent(confirmed=False)
        with self.assertRaises(DomainError):
            self.consent(recipient="09001234567")
        self.consent()
        row = CommunicationPreference.objects.get(patient=self.patient)
        self.assertNotIn("639001234567", row.encrypted_recipient)
        setup = communication_setup(
            self.request, self.organization.id, self.branch.id, self.patient.id
        )
        self.assertEqual(setup["preference"]["recipient"], "+639001234567")
        self.assertNotIn("PRIVATE", str(setup["sources"]))

    def test_preview_never_calls_provider_and_message_excludes_clinical_text(self):
        self.consent()
        result = self.schedule()
        self.assertNotIn("PRIVATE", safe_message(self.follow_up, "follow_up", "Asia/Manila"))
        with patch("medframe_apps.communications.delivery.send_sms") as send:
            self.run_due()
        send.assert_not_called()
        delivery = Delivery.objects.get(reminder_id=result["id"])
        self.assertEqual(delivery.state, "preview")
        self.assertEqual(delivery.error_code, "NOT_SENT")
        with self.assertRaises(DomainError):
            communication_action(
                self.request,
                self.organization.id,
                "retry",
                {"id": result["id"], "expected_version": 2},
                uuid4(),
            )

    def test_source_and_recipient_revisions_suppress_pending_delivery(self):
        self.consent()
        first = self.schedule()
        self.follow_up.status = "completed"
        self.follow_up.version += 1
        self.follow_up.save()
        self.run_due()
        self.assertEqual(Delivery.objects.get(reminder_id=first["id"]).state, "cancelled")
        self.follow_up.status = "open"
        self.follow_up.save()
        second = self.schedule()
        preference = CommunicationPreference.objects.get(patient=self.patient)
        preference.version += 1
        preference.sms_enabled = False
        preference.save()
        self.run_due()
        self.assertEqual(Delivery.objects.get(reminder_id=second["id"]).state, "cancelled")

    def test_duplicate_scheduling_replay_and_explicit_cancellation(self):
        self.consent()
        due = (timezone.now() + timedelta(hours=1)).isoformat()
        one = self.schedule(due_at=due)
        two = self.schedule(due_at=due)
        self.assertEqual(one["id"], two["id"])
        self.assertEqual(Reminder.objects.count(), 1)
        communication_action(
            self.request,
            self.organization.id,
            "cancel",
            {"id": one["id"], "expected_version": 1},
            uuid4(),
        )
        self.assertEqual(Delivery.objects.get().state, "cancelled")
        with self.assertRaises(DatabaseError), transaction.atomic():
            DeliveryEvent.objects.all().delete()

    @override_settings(SMS_LIVE_ENABLED=True)
    def test_ambiguous_timeout_and_expired_lease_are_never_resent(self):
        self.consent()
        result = self.schedule()
        with patch(
            "medframe_apps.communications.delivery.send_sms",
            return_value=SendResult("unknown", code="ACCEPTANCE_UNKNOWN"),
        ) as send:
            self.run_due()
            self.run_due()
        self.assertEqual(send.call_count, 1)
        delivery = Delivery.objects.get(reminder_id=result["id"])
        self.assertEqual(delivery.state, "unknown")
        with self.assertRaises(DomainError):
            communication_action(
                self.request,
                self.organization.id,
                "retry",
                {"id": result["id"], "expected_version": 2},
                uuid4(),
            )
        delivery.state = "sending"
        delivery.lease_until = timezone.now() - timedelta(minutes=1)
        delivery.save()
        self.run_due()
        delivery.refresh_from_db()
        self.assertEqual(delivery.error_code, "LEASE_EXPIRED_RECONCILE")

    @override_settings(SMS_LIVE_ENABLED=True)
    def test_known_preacceptance_retry_budget_and_accepted_is_not_delivered(self):
        self.consent()
        self.schedule()
        with patch(
            "medframe_apps.communications.delivery.send_sms",
            return_value=SendResult("retryable_failure", code="PROVIDER_RATE_LIMIT"),
        ):
            self.run_due()
        delivery = Delivery.objects.get()
        self.assertEqual(delivery.state, "retryable_failure")
        delivery.attempts = 4
        delivery.available_at = timezone.now() - timedelta(seconds=1)
        delivery.save()
        with patch(
            "medframe_apps.communications.delivery.send_sms",
            return_value=SendResult("retryable_failure", code="PROVIDER_RATE_LIMIT"),
        ):
            dispatch_due()
        delivery.refresh_from_db()
        self.assertEqual(delivery.state, "permanent_failure")
        self.assertEqual(delivery.attempts, 5)
        # A different logical reminder demonstrates provider acceptance, without real network I/O.
        self.schedule(due_at=(timezone.now() + timedelta(minutes=2)).isoformat())
        with patch(
            "medframe_apps.communications.delivery.send_sms",
            return_value=SendResult("accepted", "SMsynthetic"),
        ):
            self.run_due()
        self.assertEqual(Delivery.objects.filter(state="accepted").count(), 1)
        self.assertEqual(Delivery.objects.filter(state="delivered").count(), 0)

    @override_settings(
        SMS_LIVE_ENABLED=True,
        TWILIO_STATUS_CALLBACK_URL="https://example.test/communications/sms/status",
        TWILIO_AUTH_TOKEN="synthetic-test-token",
    )
    def test_signed_callback_and_terminal_state_do_not_regress(self):
        self.consent()
        result = self.schedule()
        delivery = Delivery.objects.get(reminder_id=result["id"])
        delivery.state = "accepted"
        delivery.provider_id = "SMsynthetic"
        delivery.save()
        url = callback_url(delivery)
        fields = {"MessageSid": "SMsynthetic", "MessageStatus": "delivered"}
        signature = RequestValidator("synthetic-test-token").compute_signature(url, fields)
        factory = RequestFactory()
        path = urlsplit(url).path + "?" + urlsplit(url).query
        rejected = sms_status(factory.post(path, fields))
        self.assertEqual(rejected.status_code, 403)
        accepted = sms_status(factory.post(path, fields, HTTP_X_TWILIO_SIGNATURE=signature))
        self.assertEqual(accepted.status_code, 204)
        provider_status(delivery.id, "SMsynthetic", "sent")
        provider_status(delivery.id, "SMsynthetic", "delivered")
        delivery.refresh_from_db()
        self.assertEqual(delivery.state, "delivered")
        self.assertEqual(delivery.events.filter(state="delivered").count(), 1)
        token = parse_qs(urlsplit(url).query)["ticket"][0]
        self.assertEqual(signing.loads(token, salt="sms-delivery:v1"), str(delivery.id))

    def test_private_portal_delivery_and_opt_out(self):
        portal_request, link = self.portal()
        self.consent(in_app_enabled=True, recipient_user_id=str(portal_request.user.id))
        result = self.schedule(channel="in_app")
        self.run_due()
        self.assertEqual(Delivery.objects.get(reminder_id=result["id"]).state, "delivered")
        self.assertEqual(
            Notification.objects.filter(user=portal_request.user, kind="patient_reminder").count(),
            1,
        )
        preference = CommunicationPreference.objects.get(patient=self.patient)
        revoke_preference(portal_request, link.id, preference.version)
        with self.assertRaises(DomainError):
            self.schedule(channel="in_app")

    def test_follow_up_automatic_time_and_deduplication(self):
        self.consent()
        communication_action(
            self.request,
            self.organization.id,
            "settings",
            {"appointment_automatic": False, "follow_up_automatic": True, "expected_version": 0},
            uuid4(),
        )
        schedule_automatic()
        schedule_automatic()
        row = Reminder.objects.get()
        self.assertEqual(row.due_at.astimezone(ZoneInfo("Asia/Manila")).hour, 9)
        self.assertTrue(row.automatic)
        self.assertEqual(row.channel, "sms")

    def test_financial_notification_loses_target_after_access_change(self):
        invoice = self.issued()
        result = notification_page(self.request, self.organization.id)
        self.assertTrue(
            any(item["href"] and str(invoice.id) in item["href"] for item in result["items"])
        )
        from medframe_apps.organizations.models import Membership

        Membership.objects.filter(user=self.admin).first().roles.remove("clinic_administrator")
        with self.assertRaises(DomainError):
            notification_page(self.request, self.organization.id)
