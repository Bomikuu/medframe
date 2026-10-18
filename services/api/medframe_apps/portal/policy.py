from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.patients.models import Patient
from medframe_apps.portal.models import PortalLink


def eligible_patient(user):
    return PortalLink.objects.filter(user=user, active=True, organization__active=True).exists()


def require_portal_link(request, link_id, *, lock=False):
    require_session_realm(request, "patient")
    queryset = PortalLink.objects.filter(
        id=link_id, user=request.user, active=True, organization__active=True, user__is_active=True
    ).select_related("patient", "organization")
    if lock:
        patient_id = queryset.values_list("patient_id", flat=True).first()
        if patient_id:
            Patient.objects.select_for_update().get(id=patient_id)
        queryset = queryset.select_for_update(of=("self",))
    link = queryset.first()
    if link is None:
        raise DomainError(
            "NOT_FOUND", "This patient connection is unavailable. Contact your clinic.", 404
        )
    return link
