"""One-use clinician-authorized sign-on, not generic device-code authentication."""

import copy
from datetime import timedelta

from django.contrib.auth import login
from django.db import transaction
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.stations.context import current_request
from medframe_apps.stations.models import StationAccessSession


def source_session(request):
    if getattr(request, "station_access", None) or getattr(request, "station_doctor", None):
        raise DomainError(
            "STATION_SCOPE", "Generate a new code from your authenticated workstation.", 403
        )
    return ClinicalSession.objects.filter(
        session_key=getattr(request.session, "session_key", None),
        user=request.user,
        realm="staff",
        revoked=False,
        expires_at__gt=timezone.now(),
        last_seen_at__gt=timezone.now() - timedelta(minutes=30),
    ).first()


def live(access, credential, now=None):
    now = now or timezone.now()
    row = access.handoff
    proof = getattr(row, "access_proof", None)
    source = proof.source_session if proof else None
    from medframe_apps.patients.models import PatientAccessGrant

    has_grant = PatientAccessGrant.objects.filter(
        patient_id=row.encounter.patient_id,
        organization_id=row.encounter.organization_id,
        active=True,
        membership__user_id=row.sender_id,
        membership__active=True,
        membership__organization__active=True,
        membership__roles__permissions__codename="encounters.write",
    ).exists()
    return bool(
        has_grant
        and credential
        and credential.id == access.credential_id
        and not credential.revoked
        and credential.expires_at > now
        and credential.device.state == "active"
        and credential.device.mode == "clinician"
        and access.expires_at > now
        and not access.session.revoked
        and access.session.expires_at > now
        and access.session.last_seen_at > now - timedelta(minutes=10)
        and source
        and not source.revoked
        and source.expires_at > now
        and row.sender.is_active
        and proof.source_auth_epoch == row.sender.auth_epoch
        and row.state == "accepted"
        and row.accepted_credential_id == credential.id
    )


def find_session(session_key):
    if not session_key:
        return None
    return (
        StationAccessSession.objects.select_related(
            "session",
            "credential__device",
            "handoff__access_proof__source_session",
            "handoff__sender",
            "handoff__encounter",
        )
        .filter(session__session_key=session_key)
        .first()
    )


@transaction.atomic
def redeem(request, value):
    from medframe_apps.stations import handoffs
    from medframe_apps.stations.policy import event

    row = handoffs.lookup(value)
    now = timezone.now()
    proof = getattr(row, "access_proof", None)
    source = proof.source_session if proof else None
    if (
        row.kind != "device"
        or row.sender_id != row.recipient_id
        or not source
        or not row.sender.is_active
        or (proof and proof.source_auth_epoch != row.sender.auth_epoch)
        or source.revoked
        or source.expires_at <= now
        or source.realm != "staff"
        or source.user_id != row.sender_id
        or source.last_seen_at <= now - timedelta(minutes=30)
        or StationAccessSession.objects.filter(session=source).exists()
    ):
        raise DomainError(
            "INVALID_CODE",
            "This code is no longer available. Ask the clinician for a new one.",
            403,
        )
    if request.user.is_authenticated and (
        request.user.id != row.sender_id or request.session.get("auth_realm", "staff") != "staff"
    ):
        raise DomainError(
            "IDENTITY_CONFLICT",
            "End the current session before opening another clinician’s code.",
            409,
        )
    if request.session.session_key == source.session_key:
        raise DomainError("SAME_DEVICE", "Enter this code on the receiving tablet.", 409)

    # Validate and accept using the issuer's explicitly delegated identity, without
    # mutating native authentication until all handoff/version/device checks succeed.
    delegated = copy.copy(request)
    delegated.user = row.sender
    delegated.session = {"mfa_verified": True, "auth_realm": "staff"}
    delegated.station_access = None
    token = current_request.set(delegated)
    try:
        result = handoffs.accept(delegated, value)
    finally:
        current_request.reset(token)
    credential = delegated.station_credential
    expiry = min(now + timedelta(minutes=30), source.expires_at, credential.expires_at)
    old_key = request.session.session_key
    if old_key:
        ClinicalSession.objects.filter(session_key=old_key).update(revoked=True)
    request.session.flush()
    login(request, row.sender, backend="django.contrib.auth.backends.ModelBackend")
    request.session["mfa_verified"] = True
    request.session["auth_realm"] = "staff"
    request.session["auth_method"] = "station_handoff"
    request.session.set_expiry(expiry)
    request.session.save()
    clinical = ClinicalSession.objects.create(
        user=row.sender,
        realm="staff",
        session_key=request.session.session_key,
        last_seen_at=now,
        expires_at=expiry,
    )
    StationAccessSession.objects.create(
        session=clinical, handoff=row, credential=credential, expires_at=expiry
    )
    request.user = row.sender
    event(
        row.sender,
        row.encounter.organization_id,
        "access.opened",
        device=credential.device,
        encounter=row.encounter,
        handoff=row,
    )
    return {**result, "expires_at": expiry.isoformat()}
