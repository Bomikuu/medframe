"""Bulk reporting and local exports require the normal MFA staff workspace."""

from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm


def require_native_staff(request):
    require_session_realm(request, "staff")
    if any(
        getattr(request, name, None)
        for name in ("station_credential", "station_access", "station_doctor", "station_error")
    ):
        raise DomainError("FORBIDDEN", "Open this action in the staff workspace.", 403)
