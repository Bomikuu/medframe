import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.common import check_version
from medframe_apps.stations.context import digest
from medframe_apps.stations.models import DeviceCredential, PairingChallenge, StationDevice
from medframe_apps.stations.policy import administrator, event

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
FUNCTIONS = {
    "clinician": {"clinical.read", "clinical.write", "billing.read", "payments.record"},
    "kiosk": {"booking", "check_in", "walk_in", "payments"},
    "display": {"queue.display"},
}


def code():
    return "".join(secrets.choice(ALPHABET) for _ in range(8))


def normalize(value):
    value = str(value).upper().replace(" ", "").replace("-", "")
    if len(value) != 8 or any(char not in ALPHABET for char in value):
        raise DomainError("INVALID_CODE", "This code is invalid, expired or already used.", 400)
    return value


def device_data(device):
    return {
        "id": str(device.id),
        "name": device.name,
        "mode": device.mode,
        "branch_id": str(device.branch_id),
        "branch": device.branch.name,
        "functions": device.functions,
        "state": device.state,
        "version": device.version,
        "last_seen_at": device.last_seen_at.isoformat() if device.last_seen_at else None,
    }


@transaction.atomic
def create(request, organization_id, data):
    administrator(request, organization_id, data.branch_id)
    if not data.functions or not set(data.functions) <= FUNCTIONS[data.mode]:
        raise DomainError("INVALID_INPUT", "Choose only functions available for this mode.")
    if data.mode == "clinician" and "clinical.read" not in data.functions:
        raise DomainError("INVALID_INPUT", "Clinician devices need record reading enabled.")
    device = StationDevice.objects.create(
        organization_id=organization_id,
        branch_id=data.branch_id,
        name=data.name,
        mode=data.mode,
        functions=sorted(set(data.functions)),
        created_by=request.user,
    )
    event(request.user, organization_id, "device.created", device=device)
    return device


def scoped_device(request, organization_id, identifier):
    member = administrator(request, organization_id)
    query = (
        StationDevice.objects.select_for_update()
        .select_related("branch")
        .filter(id=identifier, organization_id=organization_id)
    )
    if member.branch_id:
        query = query.filter(branch_id=member.branch_id)
    device = query.first()
    if device is None:
        raise DomainError("NOT_FOUND", "This device is unavailable.", 404)
    return device


@transaction.atomic
def manage(request, organization_id, identifier, action, expected_version):
    device = scoped_device(request, organization_id, identifier)
    check_version(device.version, expected_version)
    result = {}
    now = timezone.now()
    if action == "pair":
        DeviceCredential.objects.filter(device=device).update(revoked=True)
        PairingChallenge.objects.filter(device=device, consumed_at__isnull=True).update(
            expires_at=now
        )
        secret = code()
        challenge = PairingChallenge.objects.create(
            device=device,
            digest=digest(secret),
            expires_at=now + timedelta(minutes=5),
            issued_by=request.user,
        )
        device.state = "setup"
        device.approved_by = None
        device.approved_at = None
        result = {"code": secret, "expires_at": challenge.expires_at.isoformat()}
    elif action == "approve":
        credential = DeviceCredential.objects.filter(
            device=device, revoked=False, expires_at__gt=now
        ).first()
        if device.state != "pending" or not credential:
            raise DomainError("CONFLICT", "Wait for the receiving device to enter its code.", 409)
        if credential.created_at < now - timedelta(minutes=5):
            raise DomainError("EXPIRED", "The approval window expired. Generate a new code.", 409)
        device.state, device.approved_by, device.approved_at = "active", request.user, now
    elif action == "revoke":
        device.state = "revoked"
        DeviceCredential.objects.filter(device=device).update(revoked=True)
        PairingChallenge.objects.filter(device=device, consumed_at__isnull=True).update(
            expires_at=now
        )
    else:
        raise DomainError("INVALID_INPUT", "Choose pair, approve or revoke.")
    device.version += 1
    device.save()
    event(request.user, organization_id, "device." + action, device=device)
    return {"device": device_data(device), **result}


@transaction.atomic
def redeem(request, value):
    # Lock device first, matching issue/revoke/approve ordering.
    identifier = (
        PairingChallenge.objects.filter(digest=digest(normalize(value)))
        .values_list("device_id", flat=True)
        .first()
    )
    if not identifier:
        raise DomainError("INVALID_CODE", "This code is invalid, expired or already used.")
    device = StationDevice.objects.select_for_update().get(id=identifier)
    challenge = (
        PairingChallenge.objects.select_for_update()
        .filter(
            device=device,
            digest=digest(normalize(value)),
            consumed_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
        .first()
    )
    if not challenge or device.state != "setup" or not device.organization.active:
        raise DomainError("INVALID_CODE", "This code is invalid, expired or already used.")
    secret = secrets.token_urlsafe(32)
    credential = DeviceCredential.objects.create(
        device=device,
        digest=digest(secret),
        verification_phrase=code()[:6],
        expires_at=timezone.now() + timedelta(days=30),
    )
    challenge.consumed_at = timezone.now()
    challenge.save(update_fields=["consumed_at"])
    device.state = "pending"
    device.version += 1
    device.save(update_fields=["state", "version"])
    event(None, device.organization_id, "device.redeemed", device=device)
    return secret, credential
