# ruff: noqa: E402
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

from django.core.asgi import get_asgi_application

from config.body_limit import RequestBodyLimit

http_application = RequestBodyLimit(get_asgi_application())

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.conf import settings

from medframe_apps.operations.routing import websocket_urlpatterns
from django.urls import path, re_path
from medframe_apps.operations.call_consumers import RoomUpdates, MediaGateway
from medframe_apps.operations.call_presentation_consumer import ModelPresentationConsumer

websocket_urlpatterns += [
    path("ws/calls/<uuid:identifier>/presentation", ModelPresentationConsumer.as_asgi()),
    path("ws/calls/<uuid:identifier>/updates", RoomUpdates.as_asgi()),
    re_path(r"^ws/calls/(?P<identifier>[0-9a-f-]{36})/rtc(?P<tail>/v1)?$", MediaGateway.as_asgi()),
]

application = ProtocolTypeRouter(
    {
        "http": http_application,
        "websocket": OriginValidator(
            AuthMiddlewareStack(URLRouter(websocket_urlpatterns)), [settings.WEB_ORIGIN]
        ),
    }
)
