import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.throttling import throttle
from medframe_apps.auditing.services import audit
from medframe_apps.organizations.models import Membership
from medframe_apps.organizations.policy import permissions_for
from medframe_apps.portal.models import PortalLink
from medframe_apps.stations.context import digest
from medframe_apps.stations.models import (
    DeviceCredential,
    KioskBoundary,
    KioskPatientSession,
    KioskProof,
)

PATIENT_COOKIE = "medframe_kiosk_patient"
IDLE_SECONDS = 120
ABSOLUTE_SECONDS = 600
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def kiosk_device(request, function=None):
    source = getattr(request, "station_credential", None)
    credential = (
        DeviceCredential.objects.select_related("device__branch__organization")
        .filter(id=source.id)
        .first()
        if source
        else None
    )
    if (
        not credential
        or credential.revoked
        or credential.expires_at <= timezone.now()
        or credential.device.state != "active"
        or credential.device.mode != "kiosk"
        or not credential.device.branch.organization.active
        or (function and function not in credential.device.functions)
    ):
        raise DomainError(
            "DEVICE_UNAVAILABLE", "This kiosk is unavailable. Ask reception for help.", 403
        )
    return credential


def live_source(proof):
    if not proof.issued_by.is_active or proof.patient.branch_id != proof.branch_id:
        return False
    if proof.portal_link_id:
        return PortalLink.objects.filter(
            id=proof.portal_link_id,
            user_id=proof.issued_by_id,
            patient_id=proof.patient_id,
            active=True,
            organization__active=True,
        ).exists()
    membership = Membership.objects.filter(
        id=proof.membership_id,
        user_id=proof.issued_by_id,
        organization_id=proof.branch.organization_id,
        active=True,
    ).first()
    return bool(
        membership
        and (not membership.branch_id or membership.branch_id == proof.branch_id)
        and "appointments.manage" in permissions_for(membership)
    )


@transaction.atomic
def issue(patient, actor, *, membership=None, link=None, method):
    # Explicit caller authorization is checked by the dedicated staff/portal route.
    code = "".join(secrets.choice(ALPHABET) for _ in range(8))
    proof = KioskProof.objects.create(
        patient=patient,
        branch=patient.branch,
        issued_by=actor,
        membership=membership,
        portal_link=link,
        method=method,
        digest=digest(code),
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    audit(actor, "station.kiosk.proof.issued", patient.organization_id, proof.id)
    return {"code": code, "expires_at": proof.expires_at.isoformat()}


@transaction.atomic
def redeem(request, code, generation=None):
    credential = kiosk_device(request)
    boundary, _ = KioskBoundary.objects.get_or_create(credential=credential)
    boundary = KioskBoundary.objects.select_for_update().get(pk=boundary.pk)
    if generation is not None and generation != boundary.generation:
        raise DomainError(
            "PATIENT_SESSION_ENDED",
            "The kiosk was cleared. Start again with your patient code.",
            403,
        )
    throttle(request, "kiosk.verify", str(credential.id), 5, 300)
    code = str(code).strip().upper()
    proof = (
        KioskProof.objects.select_for_update(of=("self",))
        .select_related("issued_by", "patient", "branch__organization")
        .filter(digest=digest(code))
        .first()
    )
    if (
        not proof
        or proof.consumed_at
        or proof.expires_at <= timezone.now()
        or proof.branch_id != credential.device.branch_id
        or not live_source(proof)
    ):
        raise DomainError(
            "INVALID_PROOF", "This code is unavailable. Ask reception for a new patient code.", 403
        )
    # One patient on this device. A new redemption ends every earlier patient scope.
    KioskPatientSession.objects.filter(credential=credential, ended_at__isnull=True).update(
        ended_at=timezone.now()
    )
    proof.consumed_at = timezone.now()
    proof.save(update_fields=["consumed_at"])
    secret = secrets.token_urlsafe(32)
    session = KioskPatientSession.objects.create(
        proof=proof,
        credential=credential,
        digest=digest(secret),
        expires_at=timezone.now() + timedelta(seconds=ABSOLUTE_SECONDS),
        last_active_at=timezone.now(),
    )
    audit(proof.issued_by, "station.kiosk.proof.redeemed", proof.branch.organization_id, session.id)
    return secret, session


def patient_session(request, *, lock=False, function=None):
    credential = kiosk_device(request, function)
    secret = request.COOKIES.get(PATIENT_COOKIE, "")
    query = KioskPatientSession.objects.select_related(
        "proof__patient", "proof__issued_by", "proof__branch__organization", "credential__device"
    )
    if lock:
        query = query.select_for_update(of=("self",))
    session = query.filter(digest=digest(secret), credential=credential).first()
    now = timezone.now()
    if (
        not secret
        or not session
        or session.ended_at
        or session.expires_at <= now
        or session.last_active_at + timedelta(seconds=IDLE_SECONDS) <= now
        or session.proof.branch_id != credential.device.branch_id
        or not live_source(session.proof)
    ):
        raise DomainError(
            "PATIENT_SESSION_ENDED",
            "Your kiosk session ended. Start again or ask reception for help.",
            403,
        )
    return session


def session_summary(session):
    return {
        "patient_name": session.proof.patient.full_name,
        "expires_at": session.expires_at.isoformat(),
        "idle_expires_at": (session.last_active_at + timedelta(seconds=IDLE_SECONDS)).isoformat(),
    }
