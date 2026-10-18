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

application = ProtocolTypeRouter(
    {
        "http": http_application,
        "websocket": OriginValidator(
            AuthMiddlewareStack(URLRouter(websocket_urlpatterns)), [settings.WEB_ORIGIN]
        ),
    }
)
