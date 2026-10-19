from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.auditing.services import audit
from medframe_apps.organizations.models import Branch
from medframe_apps.organizations.policy import require_membership
from medframe_apps.stations.models import StationEvent


def check_membership_device(organization_id, permission):
    from medframe_apps.stations.context import current_request

    request = current_request.get()
    if request is None:
        return
    if getattr(request, "station_error", None):
        raise request.station_error
    credential = getattr(request, "station_credential", None)
    if not credential:
        return
    device = credential.device
    if (
        device.state != "active"
        or device.mode != "clinician"
        or device.organization_id != organization_id
    ):
        raise DomainError("DEVICE_SCOPE", "This device is assigned to another workspace.", 403)
    if permission.startswith(("billing.", "payments.")):
        function = "billing.read" if permission == "billing.read" else "payments.record"
        if function not in device.functions:
            raise DomainError(
                "DEVICE_SCOPE", "Financial actions are not enabled on this device.", 403
            )
    elif permission.endswith((".write", ".manage")) or permission == "patients.register":
        if "clinical.write" not in device.functions:
            raise DomainError("DEVICE_SCOPE", "This device is configured for read-only work.", 403)


def administrator(request, organization_id, branch_id=None):
    require_session_realm(request, "staff")
    member = require_membership(request.user, organization_id, "organization.manage")
    if branch_id and (
        (member.branch_id and member.branch_id != branch_id)
        or not Branch.objects.filter(id=branch_id, organization_id=organization_id).exists()
    ):
        raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
    return member


def clinician_device(request, organization_id, branch_id, *, required=False, write=False):
    require_session_realm(request, "staff")
    member = require_membership(
        request.user, organization_id, "encounters.write" if write else "patients.clinical.read"
    )
    if member.branch_id and member.branch_id != branch_id:
        raise DomainError("FORBIDDEN", "Choose your permitted branch.", 403)
    credential = getattr(request, "station_credential", None)
    if getattr(request, "station_error", None):
        raise request.station_error
    if credential is None:
        if required:
            raise DomainError(
                "PAIRING_REQUIRED", "Pair and approve this clinician device first.", 403
            )
        return None
    # Re-read live state inside write transactions, not just middleware's snapshot.
    credential.refresh_from_db()
    credential.device.refresh_from_db()
    device = credential.device
    function = "clinical.write" if write else "clinical.read"
    if (
        credential.revoked
        or credential.expires_at <= timezone.now()
        or device.state != "active"
        or device.mode != "clinician"
        or device.organization_id != organization_id
        or device.branch_id != branch_id
        or function not in device.functions
    ):
        raise DomainError(
            "DEVICE_UNAVAILABLE", "This device is not approved for this clinical task.", 403
        )
    return credential


def event(user, organization_id, kind, *, device=None, encounter=None, handoff=None):
    StationEvent.objects.create(
        actor=user,
        organization_id=organization_id,
        device=device,
        encounter=encounter,
        handoff=handoff,
        kind=kind,
    )
    audit(user, "station." + kind, organization_id, encounter.id if encounter else device.id)
