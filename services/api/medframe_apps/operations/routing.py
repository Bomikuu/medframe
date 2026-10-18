from django.urls import path

from medframe_apps.operations.consumers import OperationsConsumer

websocket_urlpatterns = [path("ws/operations", OperationsConsumer.as_asgi())]
