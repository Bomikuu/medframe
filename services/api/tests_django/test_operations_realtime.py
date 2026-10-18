from datetime import timedelta
from importlib import import_module

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.conf import settings
from django.contrib.auth import login
from django.test import RequestFactory, TransactionTestCase
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.operations.events import bump_branch
from medframe_apps.operations.models import BranchRevision
from medframe_apps.operations.realtime import socket_authority
from tests_django.operations_fixture import seed


class OperationsRealtimeTests(TransactionTestCase):
    def setUp(self):
        self.data = seed()
        store = import_module(settings.SESSION_ENGINE).SessionStore()
        request = RequestFactory().get("/")
        request.session = store
        login(request, self.data.admin, backend="django.contrib.auth.backends.ModelBackend")
        store["mfa_verified"] = True
        store["auth_realm"] = "staff"
        store.save()
        self.key = store.session_key
        ClinicalSession.objects.create(
            user=self.data.admin,
            session_key=self.key,
            realm="staff",
            last_seen_at=timezone.now(),
            expires_at=timezone.now() + timedelta(hours=1),
        )
        self.params = {"organization": str(self.data.org.id), "branch": str(self.data.branch.id)}

    def test_native_session_and_revocation(self):
        branch, epoch = socket_authority(self.key, self.params)
        self.assertEqual(branch, self.data.branch.id)
        self.assertEqual(epoch, self.data.admin.auth_epoch)
        ClinicalSession.objects.filter(session_key=self.key).update(revoked=True)
        with self.assertRaises(DomainError):
            socket_authority(self.key, self.params)

    def test_after_commit_redis_message_is_opaque_and_revision_persists(self):
        from django.db import transaction

        layer = get_channel_layer()
        group = f"operations.{self.data.branch.id.hex}"
        channel = async_to_sync(layer.new_channel)()
        async_to_sync(layer.group_add)(group, channel)
        with transaction.atomic():
            bump_branch(self.data.branch.id, "appointment.booked")
        message = async_to_sync(layer.receive)(channel)
        self.assertEqual(set(message), {"type", "kind", "revision"})
        self.assertEqual(
            BranchRevision.objects.get(branch=self.data.branch).revision, message["revision"]
        )
        async_to_sync(layer.group_discard)(group, channel)

    def test_origin_and_unauthenticated_connect_are_denied(self):
        from config.asgi import application

        async def probe(origin, cookie):
            socket = WebsocketCommunicator(
                application,
                f"/ws/operations?organization={self.data.org.id}&branch={self.data.branch.id}",
                headers=[(b"origin", origin.encode()), (b"cookie", cookie.encode())],
            )
            connected, _ = await socket.connect()
            self.assertFalse(connected)
            await socket.disconnect()

        async_to_sync(probe)(
            "http://untrusted.example", f"{settings.SESSION_COOKIE_NAME}={self.key}"
        )
        async_to_sync(probe)(settings.WEB_ORIGIN, "")

    def test_socket_receives_invalidation_then_closes_on_revocation(self):
        from channels.db import database_sync_to_async

        from config.asgi import application

        async def probe():
            socket = WebsocketCommunicator(
                application,
                f"/ws/operations?organization={self.data.org.id}&branch={self.data.branch.id}",
                headers=[
                    (b"origin", settings.WEB_ORIGIN.encode()),
                    (b"cookie", f"{settings.SESSION_COOKIE_NAME}={self.key}".encode()),
                ],
            )
            connected, _ = await socket.connect()
            self.assertTrue(connected)
            self.assertEqual((await socket.receive_json_from())["kind"], "refresh")
            await database_sync_to_async(
                lambda: ClinicalSession.objects.filter(session_key=self.key).update(revoked=True)
            )()
            await get_channel_layer().group_send(
                f"operations.{self.data.branch.id.hex}",
                {"type": "operations.changed", "revision": 5},
            )
            message = await socket.receive_output(timeout=5)
            self.assertEqual(message["type"], "websocket.close")
            await socket.disconnect()

        async_to_sync(probe)()
