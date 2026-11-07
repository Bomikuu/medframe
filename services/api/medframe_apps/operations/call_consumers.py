import asyncio
from contextlib import suppress
from urllib.parse import parse_qs

import aiohttp
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from medframe_apps.operations.call_media import client_response, participant_token
from medframe_apps.operations.call_policy import participant_for, socket_request


class RoomUpdates(AsyncWebsocketConsumer):
    async def connect(self):
        self.timer, self.group = None, None
        self.identifier = self.scope["url_route"]["kwargs"]["identifier"]
        if not await self.authorized():
            return await self.close(code=4403)
        self.group = f"call.{self.identifier.hex}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()
        self.timer = asyncio.create_task(self.watch())
        await self.send(text_data='{"kind":"refresh"}')

    async def authorized(self):
        try:
            await database_sync_to_async(participant_for)(
                socket_request(self.scope), self.identifier, lobby=True
            )
            return True
        except Exception:
            return False

    async def watch(self):
        while True:
            await asyncio.sleep(2)
            if not await self.authorized():
                await self.close(code=4403)
                return

    async def room_changed(self, event):
        if not await self.authorized():
            return await self.close(code=4403)
        await self.send(text_data='{"kind":"refresh"}')

    async def receive(self, text_data=None, bytes_data=None):
        await self.close(code=4400)

    async def disconnect(self, code):
        if self.timer:
            self.timer.cancel()
            with suppress(asyncio.CancelledError):
                await self.timer
        if self.group:
            await self.channel_layer.group_discard(self.group, self.channel_name)


class MediaGateway(AsyncWebsocketConsumer):
    async def authority(self):
        row, participant = await database_sync_to_async(participant_for)(
            socket_request(self.scope), self.identifier, health=True
        )
        if not row.started:
            raise PermissionError("Wait for the doctor")
        return row, participant

    async def connect(self):
        self.client, self.upstream, self.pump, self.timer = None, None, None, None
        self.identifier = self.scope["url_route"]["kwargs"]["identifier"]
        try:
            row, participant = await self.authority()
            if len(self.scope.get("query_string", b"")) > 4096:
                raise ValueError()
            raw = parse_qs(self.scope.get("query_string", b"").decode())
            permitted = {
                "sdk",
                "version",
                "protocol",
                "client_protocol",
                "auto_subscribe",
                "adaptive_stream",
                "reconnect",
                "sid",
                "dynacast",
                "disable_ice_lite",
            }
            params = {key: values[0][:150] for key, values in raw.items() if key in permitted}
            params["access_token"] = participant_token(row, participant)
            tail = self.scope["url_route"]["kwargs"].get("tail") or ""
            self.client = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=None, connect=3)
            )
            self.upstream = await self.client.ws_connect(
                f"http://127.0.0.1:7880/rtc{tail}", params=params, max_msg_size=131072
            )
            await self.accept()
            self.pump = asyncio.create_task(self.forward())
            self.timer = asyncio.create_task(self.watch())
        except Exception:
            if self.client:
                await self.client.close()
            await self.close(code=4403)

    async def watch(self):
        while True:
            await asyncio.sleep(1)
            try:
                await self.authority()
            except Exception:
                await self.close(code=4403)
                return

    async def forward(self):
        try:
            async for item in self.upstream:
                if item.type == aiohttp.WSMsgType.BINARY:
                    await self.send(bytes_data=client_response(item.data, binary=True))
                elif item.type == aiohttp.WSMsgType.TEXT:
                    await self.send(text_data=client_response(item.data, binary=False))
                elif item.type in {
                    aiohttp.WSMsgType.CLOSE,
                    aiohttp.WSMsgType.CLOSED,
                    aiohttp.WSMsgType.ERROR,
                }:
                    break
        except Exception:
            pass
        await self.close(code=4403)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            await self.authority()
            data = bytes_data if bytes_data is not None else text_data or ""
            if len(data) > 131072 or not self.upstream:
                raise ValueError()
            if bytes_data is not None:
                await self.upstream.send_bytes(bytes_data)
            else:
                await self.upstream.send_str(text_data)
        except Exception:
            await self.close(code=4403)

    async def disconnect(self, code):
        for task in (self.pump, self.timer):
            if task:
                task.cancel()
                with suppress(asyncio.CancelledError):
                    await task
        if self.client:
            await self.client.close()
