from django.db import connection
from django.http import JsonResponse
from redis import Redis

from config.runtime import get_settings


def csrf_failure(request, reason=""):
    return JsonResponse(
        {"code": "INVALID_CSRF", "message": "Reload this page and try again."}, status=403
    )


def health(request):
    return JsonResponse({"status": "ok", "backend": "django"})


def ready(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        with Redis.from_url(
            get_settings().redis_url, socket_timeout=2, socket_connect_timeout=2
        ) as client:
            client.ping()
    except Exception:
        return JsonResponse({"status": "unavailable"}, status=503)
    return JsonResponse({"status": "ready", "backend": "django"})
