import json
import uuid

from django.conf import settings
from django.http import JsonResponse

from config.errors import DomainError
from medframe_apps.auditing.services import request_id


class RequestBoundaryMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = request_id.set(uuid.uuid4().hex)
        try:
            if request.method not in {"GET", "HEAD", "OPTIONS"}:
                allowed_origins = {settings.WEB_ORIGIN}
                if request.path.startswith("/admin/"):
                    allowed_origins.add(f"{request.scheme}://{request.get_host()}")
                if request.headers.get("Origin") not in allowed_origins:
                    return JsonResponse(
                        {"code": "INVALID_ORIGIN", "message": "Reload this page and try again."},
                        status=403,
                    )
                if (
                    request.content_type == "application/json"
                    and int(request.headers.get("Content-Length", "0") or 0) > 65536
                ):
                    return JsonResponse(
                        {"code": "TOO_LARGE", "message": "The request is too large."}, status=413
                    )
                if (
                    request.content_type == "multipart/form-data"
                    and int(request.headers.get("Content-Length", "0") or 0) > 21 * 1024 * 1024
                ):
                    return JsonResponse(
                        {"code": "TOO_LARGE", "message": "The request is too large."}, status=413
                    )
            response = self.get_response(request)
            response["Cache-Control"] = "no-store"
            response["X-Content-Type-Options"] = "nosniff"
            response["Referrer-Policy"] = "no-referrer"
            return response
        finally:
            request_id.reset(token)


def json_object(request):
    value = json.loads(request.body)
    if not isinstance(value, dict):
        raise DomainError("INVALID_INPUT", "Use a JSON object for this request.")
    return value


def domain_view(view):
    from functools import wraps

    @wraps(view)
    def wrapped(request, *args, **kwargs):
        try:
            return view(request, *args, **kwargs)
        except DomainError as error:
            return JsonResponse({"code": error.code, "message": error.message}, status=error.status)
        except (ValueError, TypeError, KeyError):
            return JsonResponse(
                {"code": "INVALID_INPUT", "message": "Check the submitted fields and try again."},
                status=400,
            )

    return wrapped
