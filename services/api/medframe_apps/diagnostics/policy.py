from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.common import advisory_lock
from medframe_apps.diagnostics.models import DiagnosticCenter, DiagnosticRequest
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.services import require_patient, scoped_patients
from medframe_apps.providers.models import ProviderProfile


def unavailable():
    return DomainError(
        "NOT_FOUND", "This diagnostic request is unavailable or access has changed.", 404
    )


def diagnostic_lock(organization_id):
    advisory_lock(f"diagnostics:{organization_id}")


def clinic_reader(request, organization_id, patient_id, *, write=False, permission=None):
    require_session_realm(request, "staff")
    member = require_membership(
        request.user,
        organization_id,
        permission or ("diagnostics.request" if write else "diagnostics.read"),
    )
    patient = require_patient(
        request.user,
        organization_id,
        patient_id,
        "patients.clinical.write" if write else "patients.clinical.read",
        lock=write,
    )
    if write and not ProviderProfile.objects.filter(membership=member).exists():
        raise DomainError(
            "PROVIDER_REQUIRED", "Your clinic membership needs a provider profile.", 403
        )
    return member, patient


def center_member(request, organization_id):
    require_session_realm(request, "staff")
    member = require_membership(request.user, organization_id, "diagnostics.center.work")
    if (
        member.branch_id
        or not DiagnosticCenter.objects.filter(organization_id=organization_id).exists()
    ):
        raise unavailable()
    return member


def request_scope(request, organization_id, context):
    if context == "clinic":
        require_session_realm(request, "staff")
        require_membership(request.user, organization_id, "diagnostics.read")
        patients = scoped_patients(request.user, organization_id, "patients.clinical.read")
        return DiagnosticRequest.objects.filter(
            organization_id=organization_id, patient_id__in=patients.values("id")
        )
    if context == "center":
        center_member(request, organization_id)
        return DiagnosticRequest.objects.filter(
            sharing=True,
            organization__active=True,
            assignment__active=True,
            assignment__partnership__active=True,
            assignment__partnership__center__organization_id=organization_id,
            assignment__partnership__center__organization__active=True,
        ).exclude(state__in=["draft", "awaiting_center", "cancelled"])
    raise unavailable()


def get_request(request, organization_id, request_id, *, context, lock=False):
    initial = request_scope(request, organization_id, context).filter(id=request_id).first()
    if initial is None:
        raise unavailable()
    if lock:
        diagnostic_lock(initial.organization_id)
    query = request_scope(request, organization_id, context)
    if lock:
        query = query.select_for_update(of=("self",))
    row = (
        query.select_related(
            "patient",
            "organization",
            "provider__membership__user",
            "assignment__partnership__center",
            "current_result",
        )
        .filter(id=request_id)
        .first()
    )
    if row is None:
        raise unavailable()
    return row
