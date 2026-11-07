"""Doctor-owned one-use entry to a branch-scoped clinical workspace."""

import copy
from datetime import timedelta

from django.contrib.auth import login
from django.db import transaction
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.organizations.models import Branch, Membership
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.stations.access import source_session
from medframe_apps.stations.context import current_request, digest
from medframe_apps.stations.models import DoctorAccessCode, DoctorStationSession
from medframe_apps.stations.pairing import code, normalize
from medframe_apps.stations.policy import clinician_device, event


def find_session(key):
    return (
        DoctorStationSession.objects.select_related(
            "session",
            "credential__device",
            "code__source_session__user",
            "code__provider__membership",
        )
        .filter(session__session_key=key)
        .first()
        if key
        else None
    )


def source_live(row, now):
    from medframe_apps.accounts.sign_in_policy import clinical_assurance_valid

    source = row.source_session
    member = row.provider.membership
    return bool(
        source.realm == "staff"
        and not source.revoked
        and clinical_assurance_valid(source)
        and source.expires_at > now
        and source.user.is_active
        and source.user_id == member.user_id
        and source.user.auth_epoch == row.source_auth_epoch
        and Membership.objects.filter(
            id=member.id,
            active=True,
            organization__active=True,
            organization_id=row.organization_id,
            roles__permissions__codename="encounters.write",
        ).exists()
        and (not member.branch_id or member.branch_id == row.branch_id)
    )


def live(access, credential):
    now = timezone.now()
    return bool(
        credential
        and credential.id == access.credential_id
        and not credential.revoked
        and credential.expires_at > now
        and credential.device.state == "active"
        and credential.device.mode == "clinician"
        and "clinical.read" in credential.device.functions
        and credential.device.organization_id == access.code.organization_id
        and credential.device.branch_id == access.code.branch_id
        and access.expires_at > now
        and not access.session.revoked
        and access.session.expires_at > now
        and access.session.last_seen_at > now - timedelta(minutes=10)
        and source_live(access.code, now)
    )


@transaction.atomic
def issue(request, organization_id, branch_id):
    require_session_realm(request, "staff")
    source = source_session(request)
    if not source:
        raise DomainError(
            "AUTH_REQUIRED", "Use your signed-in clinic workstation to create a code.", 403
        )
    if not Branch.objects.filter(id=branch_id, organization_id=organization_id).exists():
        raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
    clinician_device(request, organization_id, branch_id, write=True)
    provider = (
        ProviderProfile.objects.select_related("membership")
        .filter(
            membership__user=request.user,
            membership__organization_id=organization_id,
            membership__active=True,
        )
        .first()
    )
    if not provider:
        raise DomainError("PROVIDER_REQUIRED", "Your active provider profile is required.", 403)
    # Serialize concurrent issue requests on the source session. A new code replaces unused ones.
    ClinicalSession.objects.select_for_update().get(id=source.id)
    now = timezone.now()
    DoctorAccessCode.objects.filter(
        provider=provider,
        consumed_at__isnull=True,
        expires_at__gt=now,
    ).update(expires_at=now)
    secret = code()
    row = DoctorAccessCode.objects.create(
        organization_id=organization_id,
        branch_id=branch_id,
        provider=provider,
        source_session=source,
        source_auth_epoch=request.user.auth_epoch,
        digest=digest(secret),
        expires_at=now + timedelta(minutes=5),
    )
    event(request.user, organization_id, "doctor.code.issued")
    return {"code": secret, "expires_at": row.expires_at.isoformat(), "id": str(row.id)}


@transaction.atomic
def redeem(request, value):
    row = (
        DoctorAccessCode.objects.select_for_update(of=("self",))
        .select_related(
            "source_session__user",
            "provider__membership",
        )
        .filter(digest=digest(normalize(value)))
        .first()
    )
    now = timezone.now()
    if not row or row.consumed_at or row.expires_at <= now or not source_live(row, now):
        raise DomainError(
            "INVALID_CODE", "This doctor code is invalid, expired or already used.", 403
        )
    if row.source_session.last_seen_at <= now - timedelta(minutes=30):
        raise DomainError("INVALID_CODE", "Ask the doctor to generate a fresh code.", 403)
    if request.session.session_key == row.source_session.session_key:
        raise DomainError("SAME_DEVICE", "Enter the code on the receiving tablet.", 409)
    user = row.source_session.user
    if request.user.is_authenticated and (
        request.user.id != user.id or request.session.get("auth_realm", "staff") != "staff"
    ):
        raise DomainError(
            "IDENTITY_CONFLICT", "End the current session before switching doctors.", 409
        )
    delegated = copy.copy(request)
    delegated.user = user
    delegated.session = {"auth_realm": "staff", "mfa_verified": True}
    delegated.station_access = None
    delegated.station_doctor = None
    token = current_request.set(delegated)
    try:
        credential = clinician_device(
            delegated,
            row.organization_id,
            row.branch_id,
            required=True,
            write=True,
        )
    finally:
        current_request.reset(token)
    expiry = min(now + timedelta(minutes=30), row.source_session.expires_at, credential.expires_at)
    if request.session.session_key:
        ClinicalSession.objects.filter(session_key=request.session.session_key).update(revoked=True)
    request.session.flush()
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    request.session.update(
        {"mfa_verified": True, "auth_realm": "staff", "auth_method": "station_doctor"}
    )
    request.session.set_expiry(expiry)
    request.session.save()
    native = ClinicalSession.objects.create(
        user=user,
        realm="staff",
        session_key=request.session.session_key,
        last_seen_at=now,
        expires_at=expiry,
    )
    row.consumed_at = now
    row.save(update_fields=["consumed_at"])
    DoctorStationSession.objects.create(
        session=native, code=row, credential=credential, expires_at=expiry
    )
    event(user, row.organization_id, "doctor.access.opened", device=credential.device)
    return {"organization_id": str(row.organization_id), "expires_at": expiry.isoformat()}
