"""Bounded synthetic mechanism probes; no clinical channels, HTTP sessions or repairs."""

import asyncio
import io
import json
import os
import warnings
from uuid import uuid4

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
import django

django.setup()
from channels_redis.core import RedisChannelLayer
from django.conf import settings
from django.http import FileResponse
from redis.exceptions import TimeoutError as RedisTimeoutError


async def main():
    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter("always")
        response = FileResponse(io.BytesIO(b"Synthetic review file only"))
        body = b"".join([chunk async for chunk in response])
        # Close the stream only, avoiding request_finished/DB connection side effects.
        response.file_to_stream.close()
    print(
        json.dumps(
            {
                "probe": "sync_file_async_consumption",
                "bytes": len(body),
                "warnings": [str(w.message) for w in captured],
            }
        )
    )
    configured = settings.CHANNEL_LAYERS["default"]["CONFIG"]
    layer = RedisChannelLayer(**{**configured, "prefix": "phase5-probe-" + uuid4().hex})
    channel = await layer.new_channel()
    try:
        try:
            await asyncio.wait_for(layer.receive(channel), timeout=8)
            outcome = "Unexpected message"
        except (TimeoutError, RedisTimeoutError) as error:
            outcome = type(error).__module__ + "." + type(error).__name__
        print(
            json.dumps(
                {
                    "probe": "isolated_idle_channel_8_seconds",
                    "outcome": outcome,
                    "production_channels_used": False,
                }
            )
        )
    finally:
        await layer.close_pools()


asyncio.run(main())
