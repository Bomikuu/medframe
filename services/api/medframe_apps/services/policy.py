from config.errors import DomainError
from medframe_apps.billing.policy import scoped_branches, staff_member
from medframe_apps.organizations.policy import permissions_for
from medframe_apps.services.models import PatientServiceCase, ServiceDefinition


def member(request, organization_id, permission="services.read"):
    if (
        getattr(request, "station_access", None)
        or getattr(request, "station_doctor", None)
        or getattr(request, "station_credential", None)
        or request.headers.get("X-Medframe-Workspace") == "station"
    ):
        if permission != "services.read" or getattr(request, "station_access", None):
            raise DomainError(
                "FORBIDDEN", "Manage service agreements in the regular clinic workspace.", 403
            )
        from medframe_apps.stations.policy import clinician_device
        from medframe_apps.providers.models import ProviderProfile

        credential = getattr(request, "station_credential", None)
        if not ProviderProfile.objects.filter(
            membership__user=request.user,
            membership__organization_id=organization_id,
            membership__active=True,
            membership__user__is_active=True,
        ).exists():
            raise DomainError(
                "FORBIDDEN", "Service progress requires an approved doctor Station.", 403
            )
        if credential:
            clinician_device(request, organization_id, credential.device.branch_id)
    return staff_member(request, organization_id, permission)


def definition(member, identifier, branch_id=None, *, active=False, lock=False):
    query = ServiceDefinition.objects.filter(organization_id=member.organization_id)
    if lock:
        query = query.select_for_update(of=("self",))
    if branch_id:
        if not scoped_branches(member).filter(id=branch_id).exists():
            raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
        query = query.filter(branches__id=branch_id)
    if active:
        query = query.filter(active=True)
    row = query.filter(id=identifier).first()
    if row is None:
        raise DomainError("NOT_FOUND", "This service is unavailable.", 404)
    return row


def case_record(member, identifier, *, lock=False):
    query = PatientServiceCase.objects.filter(
        organization_id=member.organization_id, branch_id__in=scoped_branches(member)
    )
    from medframe_apps.stations.context import current_request

    request = current_request.get()
    if request and (
        getattr(request, "station_doctor", None)
        or getattr(request, "station_credential", None)
        or request.headers.get("X-Medframe-Workspace") == "station"
    ):
        from medframe_apps.patients.services import scoped_patients

        query = query.filter(
            patient_id__in=scoped_patients(
                request.user, member.organization_id, "patients.clinical.read"
            ).values("id")
        )
    if lock:
        query = query.select_for_update(of=("self",))
    row = query.select_related("patient", "service").filter(id=identifier).first()
    if row is None:
        raise DomainError("NOT_FOUND", "This patient service is unavailable.", 404)
    return row


def financial(member):
    from medframe_apps.stations.context import current_request

    request = current_request.get()
    if request and (
        getattr(request, "station_doctor", None)
        or getattr(request, "station_credential", None)
        or request.headers.get("X-Medframe-Workspace") == "station"
    ):
        return False
    return "billing.read" in permissions_for(member)
