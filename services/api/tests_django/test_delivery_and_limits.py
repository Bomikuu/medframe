import json
from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch

from django.core import mail
from django.utils import timezone

from config.body_limit import RequestBodyLimit
from config.crypto import cipher
from medframe_apps.accounts.models import MailOutbox
from medframe_apps.accounts.tasks import deliver_recovery_mail
from tests_django.test_boundaries import ClinicalFixture


class RecoveryDeliveryTests(ClinicalFixture):
    def item(self):
        payload = {
            "recipient": self.doctor.email,
            "link": "http://localhost:3000/auth/reset#token=synthetic-only",
        }
        return MailOutbox.objects.create(
            encrypted_payload=cipher().encrypt(json.dumps(payload).encode()).decode(),
            available_at=timezone.now(),
        )

    def test_delivery_wipes_payload_after_success(self):
        item = self.item()
        deliver_recovery_mail()
        item.refresh_from_db()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(item.encrypted_payload, "")
        self.assertIsNotNone(item.sent_at)

    def test_delivery_backs_off_and_stops_after_five(self):
        item = self.item()
        with patch(
            "medframe_apps.accounts.tasks.send_mail", side_effect=OSError("synthetic outage")
        ):
            for _ in range(5):
                MailOutbox.objects.filter(id=item.id).update(available_at=timezone.now())
                deliver_recovery_mail()
        item.refresh_from_db()
        self.assertEqual(item.attempts, 5)
        self.assertIsNone(item.sent_at)
        self.assertTrue(item.encrypted_payload)
        MailOutbox.objects.filter(id=item.id).update(available_at=timezone.now())
        deliver_recovery_mail()
        item.refresh_from_db()
        self.assertIsNone(item.sent_at)


class StreamLimitTests(IsolatedAsyncioTestCase):
    async def test_chunked_json_is_bounded_before_parsing(self):
        async def app(scope, receive, send):
            while True:
                message = await receive()
                if not message.get("more_body"):
                    break
            await send({"type": "http.response.start", "status": 200})

        messages = iter(
            [
                {"type": "http.request", "body": b"x" * 32768, "more_body": True},
                {"type": "http.request", "body": b"x" * 32769},
            ]
        )

        async def receive():
            return next(messages)

        sent = []

        async def send(message):
            sent.append(message)

        await RequestBodyLimit(app)({"type": "http", "path": "/graphql"}, receive, send)
        self.assertEqual(sent[0]["status"], 413)
        self.assertIn((b"cache-control", b"no-store"), sent[0]["headers"])
