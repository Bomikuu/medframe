"""Self-service display name editing, independent of clinic administration."""

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from config.errors import DomainError
from config.middleware import domain_view, json_object
from medframe_apps.accounts.models import User
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.auditing.services import audit


@require_POST
@domain_view
def profile(request):
    actor = require_session_realm(request, "staff")
    if (
        getattr(request, "station_access", None)
        or getattr(request, "station_doctor", None)
        or getattr(request, "station_credential", None)
        or request.headers.get("X-Medframe-Workspace") == "station"
    ):
        raise DomainError("FORBIDDEN", "Edit your account from your own clinic workspace.", 403)
    data = json_object(request)
    action = data.get("action", "read")
    if action == "read":
        return JsonResponse({"display_name": actor.display_name, "email": actor.email})
    if action != "update":
        raise DomainError("INVALID_INPUT", "Choose a supported account action.")
    name = data.get("display_name")
    if (
        not isinstance(name, str)
        or not 1 <= len(name.strip()) <= 160
        or any(ord(character) < 32 for character in name)
    ):
        raise DomainError("INVALID_INPUT", "Enter a display name between 1 and 160 characters.")
    with transaction.atomic():
        user = User.objects.select_for_update().get(pk=actor.pk)
        if data.get("expected_name") != user.display_name:
            raise DomainError(
                "CONFLICT", "Your name changed elsewhere. Reload your account before saving.", 409
            )
        user.display_name = name.strip()
        user.save(update_fields=["display_name"])
        audit(user, "account.profile.updated")
    return JsonResponse({"display_name": user.display_name, "email": user.email})
