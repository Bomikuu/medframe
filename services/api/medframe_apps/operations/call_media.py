"""Only the server-side gateway sees a LiveKit credential."""

from datetime import timedelta
import aiohttp
from livekit import api
from google.protobuf.json_format import MessageToDict, ParseDict
from livekit.protocol.rtc import SignalResponse

from medframe_apps.operations.call_policy import media_config


def media_name(row):
    return f"mf-{row.id.hex}-{row.generation}"


def participant_token(row, participant):
    config = media_config()
    return (
        api.AccessToken(config["key"], config["secret"])
        .with_identity(str(participant.id))
        .with_ttl(timedelta(seconds=30))
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=media_name(row),
                can_publish=True,
                can_subscribe=True,
                can_publish_data=False,
                can_update_own_metadata=False,
                can_publish_sources=["camera", "microphone"],
            )
        )
        .to_jwt()
    )


def client_response(data, *, binary):
    message = SignalResponse()
    if binary:
        message.ParseFromString(data)
    else:
        import json

        ParseDict(json.loads(data), message, ignore_unknown_fields=False)
    # Never release a self-hosted media credential to an end-user, including
    # refreshed or moved-room tokens. The SDK's public placeholder has no powers.
    if message.WhichOneof("message") == "refresh_token":
        message.refresh_token = "medframe"
    if message.HasField("join"):
        message.join.alternative_url = ""
    if message.HasField("room_moved"):
        for field in message.room_moved.DESCRIPTOR.fields:
            if "token" in field.name or "url" in field.name:
                message.room_moved.ClearField(field.name)
    if binary:
        return message.SerializeToString()
    import json

    return json.dumps(MessageToDict(message))


async def media_client():
    config = media_config()
    return api.LiveKitAPI(
        "http://127.0.0.1:7880",
        config["key"],
        config["secret"],
        timeout=aiohttp.ClientTimeout(total=2),
        failover=False,
    )
