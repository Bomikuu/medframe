"""Dedicated same-origin room-model channel, never a clinical data channel."""

import asyncio
import json
from contextlib import suppress

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from config.errors import DomainError
from medframe_apps.operations.call_presentation_protocol import parse_presentation_command
from medframe_apps.operations.call_presentation_store import (
    apply_presentation_command,
    presentation_authority,
    presentation_snapshot,
)


class ModelPresentationConsumer(AsyncWebsocketConsumer):
    channel_layer_alias = "call_presentation"

    async def connect(self):
        self.timer, self.group = None, None
        self.identifier = self.scope["url_route"]["kwargs"]["identifier"]
        self.generation = None
        try:
            row, _ = await database_sync_to_async(presentation_authority)(
                self.scope, self.identifier
            )
            self.generation = row.generation
        except DomainError:
            return await self.close(code=4403)
        self.group = f"call-model.{self.identifier.hex}.{self.generation}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()
        await self.deliver("snapshot")
        self.timer = asyncio.create_task(self.watch())

    async def authority(self):
        row, participant = await database_sync_to_async(presentation_authority)(
            self.scope, self.identifier
        )
        if row.generation != self.generation:
            raise DomainError("ROOM_ENDED", "Room access has changed.", 410)
        return row, participant

    async def deliver(self, kind):
        try:
            row, participant = await self.authority()
            state = await database_sync_to_async(presentation_snapshot)(row, participant)
            await self.send(text_data=json.dumps({"kind": kind, "state": state}))
        except DomainError as error:
            if error.code == "PRESENTATION_UNAVAILABLE":
                await self.send(
                    text_data=json.dumps(
                        {"kind": "recoverable_error", "code": error.code, "message": error.message}
                    )
                )
            else:
                await self.close(code=4403)

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data is not None or text_data is None or len(text_data.encode()) > 4096:
            return await self.close(code=4400)
        try:
            await self.authority()
            command = parse_presentation_command(text_data)
            await database_sync_to_async(apply_presentation_command)(
                self.scope, self.identifier, command
            )
            await self.channel_layer.group_send(self.group, {"type": "presentation.changed"})
        except DomainError as error:
            if error.code in {
                "ROOM_ENDED",
                "ROOM_ACCESS_REQUIRED",
                "FORBIDDEN",
                "UNAUTHENTICATED",
                "WAITING_REMOVED",
                "WAITING_FOR_ADMISSION",
            }:
                return await self.close(code=4403)
            await self.send(
                text_data=json.dumps(
                    {"kind": "recoverable_error", "code": error.code, "message": error.message}
                )
            )
            if error.code not in {"PRESENTATION_RATE", "PRESENTATION_UNAVAILABLE"}:
                await self.deliver("snapshot")

    async def presentation_changed(self, event):
        # Read current authoritative state rather than replaying potentially stale payloads.
        await self.deliver("presentation_updated")

    async def watch(self):
        ticks = 0
        while True:
            await asyncio.sleep(2)
            try:
                await self.authority()
                ticks += 1
                if ticks % 15 == 0:
                    await self.channel_layer.group_add(self.group, self.channel_name)
            except DomainError:
                await self.close(code=4403)
                return

    async def disconnect(self, code):
        if self.timer:
            self.timer.cancel()
            with suppress(asyncio.CancelledError):
                await self.timer
        if self.group:
            await self.channel_layer.group_discard(self.group, self.channel_name)
