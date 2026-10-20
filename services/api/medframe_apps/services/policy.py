from config.errors import DomainError
from medframe_apps.billing.policy import scoped_branches, staff_member
from medframe_apps.organizations.policy import permissions_for
from medframe_apps.services.models import PatientServiceCase, ServiceDefinition


def member(request, organization_id, permission="services.read"):
    if (
        getattr(request, "station_access", None)
        or getattr(request, "station_doctor", None)
        or getattr(request, "station_credential", None)
    ):
        raise DomainError("FORBIDDEN", "Open Services in the regular clinic workspace.", 403)
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
    if lock:
        query = query.select_for_update(of=("self",))
    row = query.select_related("patient", "service").filter(id=identifier).first()
    if row is None:
        raise DomainError("NOT_FOUND", "This patient service is unavailable.", 404)
    return row


def financial(member):
    return "billing.read" in permissions_for(member)
