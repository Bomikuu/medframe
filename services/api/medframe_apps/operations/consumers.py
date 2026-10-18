import asyncio
from contextlib import suppress
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from medframe_apps.operations.realtime import socket_authority


class OperationsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.timer = None
        self.group = None
        if len(self.scope.get("query_string", b"")) > 512:
            return await self.close(code=4400)
        self.params = {
            key: values[0]
            for key, values in parse_qs(self.scope.get("query_string", b"").decode()).items()
        }
        self.session_key = self.scope["session"].session_key
        if not await self.authorized():
            return await self.close(code=4403)
        self.group = f"operations.{self.branch.hex}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()
        self.timer = asyncio.create_task(self.watch_authority())
        await self.send(text_data='{"kind":"refresh","revision":0}')

    async def authorized(self):
        try:
            branch, epoch = await database_sync_to_async(socket_authority)(
                self.session_key, self.params
            )
            if self.group and (branch != self.branch or epoch != self.epoch):
                return False
            self.branch, self.epoch = branch, epoch
            return True
        except Exception:
            # No domain/session details are sent to an unauthorized peer.
            return False

    async def watch_authority(self):
        while True:
            await asyncio.sleep(25)
            if not await self.authorized():
                await self.close(code=4403)
                return
            await self.channel_layer.group_add(self.group, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # This socket is server-to-client invalidation only.
        await self.close(code=4400)

    async def operations_changed(self, message):
        if not await self.authorized():
            return await self.close(code=4403)
        import json

        await self.send(text_data=json.dumps({"kind": "changed", "revision": message["revision"]}))

    async def disconnect(self, code):
        if self.timer:
            self.timer.cancel()
            with suppress(asyncio.CancelledError):
                await self.timer
        if self.group:
            await self.channel_layer.group_discard(self.group, self.channel_name)
