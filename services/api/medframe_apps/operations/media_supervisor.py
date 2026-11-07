"""Fail closed: this parent owns the media process and its authorization lease."""

import asyncio
import ctypes
import os
import signal
import subprocess
import time
import threading

from functools import partial
from asgiref.sync import sync_to_async
from livekit import api
from redis import Redis

from config.errors import DomainError
from config.runtime import ROOT, get_settings
from medframe_apps.operations.call_models import AppointmentRoom
from medframe_apps.operations.call_media import media_client, media_name
from medframe_apps.operations.call_policy import doctor_for, live_room, native_request


def allowed_rooms():
    result = {}
    for row in AppointmentRoom.objects.filter(started=True, ended_at__isnull=True).select_related(
        "appointment__branch__organization", "appointment__provider__membership__user"
    ):
        try:
            live_room(row)
            participants = list(row.participants.filter(revoked=False, generation=row.generation))
            doctor = next((item for item in participants if item.role == "doctor"), None)
            if not doctor:
                continue
            request = native_request(doctor.native_session_key)
            doctor_for(request, row)
            result[media_name(row)] = {
                str(item.id) for item in participants if item.role == "doctor" or item.admitted
            }
        except DomainError:
            continue
    return result


def parent_guard(expected_parent):
    # Linux parent-death signal also closes all media if this supervisor is killed.
    if ctypes.CDLL(None).prctl(1, signal.SIGKILL) != 0 or os.getppid() != expected_parent:
        os._exit(1)


async def enforce(child, heartbeat):
    client = await media_client()
    deadline = [time.monotonic() + 15]
    stopped = threading.Event()

    def watchdog():
        while not stopped.wait(0.25):
            if time.monotonic() > deadline[0]:
                child.kill()
                return

    threading.Thread(target=watchdog, daemon=True).start()
    try:
        for _ in range(40):
            if child.poll() is not None:
                raise RuntimeError("Local media server stopped during startup.")
            try:
                await client.room.list_rooms(api.ListRoomsRequest())
                break
            except Exception:
                await asyncio.sleep(0.25)
        else:
            raise RuntimeError("Local media server did not become ready.")
        while child.poll() is None:
            started = time.monotonic()
            allowed = await asyncio.wait_for(
                sync_to_async(allowed_rooms, thread_sensitive=True)(), timeout=2
            )
            rooms = await client.room.list_rooms(api.ListRoomsRequest())
            for room in rooms.rooms:
                if room.name not in allowed:
                    await client.room.delete_room(api.DeleteRoomRequest(room=room.name))
                    continue
                participants = await client.room.list_participants(
                    api.ListParticipantsRequest(room=room.name)
                )
                for participant in participants.participants:
                    if participant.identity not in allowed[room.name]:
                        await client.room.remove_participant(
                            api.RoomParticipantIdentity(
                                room=room.name, identity=participant.identity
                            )
                        )
            if time.monotonic() - started >= 3:
                raise RuntimeError("Call enforcement deadline missed; closing media.")
            deadline[0] = time.monotonic() + 3
            heartbeat.set("medframe:call-media:lease", "ready", ex=3)
            await asyncio.sleep(0.5)
    finally:
        stopped.set()
        if child.poll() is None:
            child.kill()
        await client.aclose()


def run():
    state = ROOT / ".medframe-runtime/media"
    child = None
    heartbeat = Redis.from_url(get_settings().redis_url, socket_timeout=1, socket_connect_timeout=1)

    def shutdown(signum, frame):
        raise SystemExit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    try:
        child = subprocess.Popen(
            [str(state / "livekit-server"), "--config", str(state / "server.yaml")],
            preexec_fn=partial(parent_guard, os.getpid()),
        )
        asyncio.run(enforce(child, heartbeat))
    finally:
        try:
            heartbeat.delete("medframe:call-media:lease")
        finally:
            heartbeat.close()
            if child and child.poll() is None:
                child.kill()
                child.wait(timeout=5)
