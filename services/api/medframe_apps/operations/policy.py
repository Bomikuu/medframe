from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.organizations.models import Branch
from medframe_apps.organizations.policy import permissions_for, require_membership
from medframe_apps.patients.models import Patient
from medframe_apps.patients.services import scoped_patients
from medframe_apps.providers.models import ProviderProfile


def require_operations(request, organization_id, permission, branch_id):
    require_session_realm(request, "staff")
    member = require_membership(request.user, organization_id, permission)
    credential = getattr(request, "station_credential", None)
    if credential and credential.device.branch_id != branch_id:
        raise DomainError("NOT_FOUND", "This branch is unavailable on this device.", 404)
    if (member.branch_id and member.branch_id != branch_id) or not Branch.objects.filter(
        id=branch_id, organization_id=organization_id
    ).exists():
        raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
    return member


def require_provider_scope(member, provider_id):
    query = ProviderProfile.objects.select_related("membership__user").filter(
        id=provider_id,
        membership__organization_id=member.organization_id,
        membership__active=True,
        membership__user__is_active=True,
    )
    if member.branch_id:
        query = query.filter(membership__branch_id__in=[member.branch_id]) | query.filter(
            membership__branch__isnull=True
        )
    if (
        "schedules.manage" not in permissions_for(member)
        and not member.roles.filter(name="receptionist").exists()
    ):
        query = query.filter(membership__user_id=member.user_id)
    provider = query.first()
    if provider is None:
        raise DomainError("NOT_FOUND", "This provider is unavailable in your branch.", 404)
    return provider


def operational_patient(member, patient_id, branch_id):
    patient = Patient.objects.filter(
        id=patient_id, organization_id=member.organization_id, branch_id=branch_id
    ).first()
    if patient is None:
        raise DomainError("NOT_FOUND", "This patient is unavailable in this branch.", 404)
    return patient


def consultation_setup(request, organization_id, patient_id, provider_id, branch_id):
    member = require_operations(request, organization_id, "operations.read", branch_id)
    blockers = []
    provider = ProviderProfile.objects.filter(
        id=provider_id,
        membership__user=request.user,
        membership__active=True,
        membership__organization_id=organization_id,
    ).first()
    if provider is None:
        blockers.append(
            {
                "code": "PROVIDER_REQUIRED",
                "message": "Your membership needs an active provider profile.",
                "action": "Contact your clinic administrator.",
            }
        )
    elif provider.membership.branch_id and provider.membership.branch_id != branch_id:
        blockers.append(
            {
                "code": "BRANCH_MISMATCH",
                "message": "Your provider profile belongs to another branch.",
                "action": "Choose your permitted branch.",
            }
        )
    if "encounters.write" not in permissions_for(member):
        blockers.append(
            {
                "code": "CLINICAL_ROLE_REQUIRED",
                "message": "Starting care requires a doctor or dentist role.",
                "action": "Ask an authorized clinician to start the consultation.",
            }
        )
    has_clinical_permission = "patients.clinical.read" in permissions_for(member)
    has_grant = (
        has_clinical_permission
        and scoped_patients(request.user, organization_id, "patients.clinical.read")
        .filter(id=patient_id)
        .exists()
    )
    if not has_grant:
        blockers.append(
            {
                "code": "PATIENT_GRANT_REQUIRED",
                "message": "This patient needs an explicit clinical access grant.",
                "action": "Ask your clinic administrator to grant patient access.",
            }
        )
    return blockers
