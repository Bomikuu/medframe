from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.billing.models import Invoice
from medframe_apps.organizations.models import Branch
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.models import Patient


def staff_member(request, organization_id, permission="billing.read"):
    require_session_realm(request, "staff")
    return require_membership(request.user, organization_id, permission)


def scoped_branches(member):
    query = Branch.objects.filter(organization_id=member.organization_id)
    from medframe_apps.stations.context import current_request

    request = current_request.get()
    credential = getattr(request, "station_credential", None) if request else None
    if credential:
        query = query.filter(id=credential.device.branch_id)
    return query.filter(id=member.branch_id) if member.branch_id else query


def financial_patient(member, branch_id, patient_id):
    if not scoped_branches(member).filter(id=branch_id).exists():
        raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
    patient = Patient.objects.filter(
        id=patient_id, branch_id=branch_id, organization_id=member.organization_id
    ).first()
    if patient is None:
        raise DomainError("NOT_FOUND", "This patient is unavailable in this branch.", 404)
    return patient


def invoice_scope(member):
    return Invoice.objects.filter(
        organization_id=member.organization_id, branch_id__in=scoped_branches(member).values("id")
    )


def get_invoice(member, identifier, *, lock=False):
    query = invoice_scope(member)
    if lock:
        query = query.select_for_update(of=("self",))
    row = query.select_related("patient", "branch", "organization").filter(id=identifier).first()
    if row is None:
        raise DomainError("NOT_FOUND", "This invoice is unavailable.", 404)
    return row
