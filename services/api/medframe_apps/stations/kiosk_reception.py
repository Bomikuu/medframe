"""Reception authorizes one named patient's access on one approved kiosk."""

import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version
from medframe_apps.stations.context import digest
from medframe_apps.stations.kiosk_identity import (
    IDLE_SECONDS,
    kiosk_device,
    live_source,
    open_patient_session,
)
from medframe_apps.stations.models import (
    DeviceCredential,
    KioskAssignment,
    KioskBoundary,
    KioskPatientSession,
    KioskPolicy,
    KioskProof,
)


def strict(device):
    return KioskPolicy.objects.filter(device=device, strict_verification=True).exists()


def occupied(credential):
    now = timezone.now()
    return KioskPatientSession.objects.filter(
        credential=credential,
        ended_at__isnull=True,
        expires_at__gt=now,
        last_active_at__gt=now - timedelta(seconds=IDLE_SECONDS),
    ).exists()


def boundary_for(credential):
    boundary, _ = KioskBoundary.objects.get_or_create(credential=credential)
    return KioskBoundary.objects.select_for_update().get(pk=boundary.pk)


def devices(branch):
    now = timezone.now()
    rows = (
        DeviceCredential.objects.select_related("device")
        .filter(
            device__branch=branch,
            device__mode="kiosk",
            device__state="active",
            revoked=False,
            expires_at__gt=now,
        )
        .order_by("device__name", "-created_at")
    )
    result, seen = [], set()
    for row in rows:
        if row.device_id in seen:
            continue
        seen.add(row.device_id)
        boundary, _ = KioskBoundary.objects.get_or_create(credential=row)
        pending = KioskAssignment.objects.filter(
            credential=row,
            generation=boundary.generation,
            consumed_at__isnull=True,
            expires_at__gt=now,
        ).exists()
        result.append(
            {
                "id": str(row.device_id),
                "name": row.device.name,
                "version": row.device.version,
                "generation": boundary.generation,
                "strict_verification": strict(row.device),
                "occupied": occupied(row) or pending,
            }
        )
    return result


@transaction.atomic
def assign(request, member, patient, branch, data):
    credential = (
        DeviceCredential.objects.select_related("device")
        .filter(
            device_id=data["device_id"],
            device__branch=branch,
            device__mode="kiosk",
            device__state="active",
            revoked=False,
            expires_at__gt=timezone.now(),
        )
        .order_by("-created_at")
        .first()
    )
    if not credential:
        raise DomainError("NOT_FOUND", "Choose an approved kiosk in this branch.", 404)
    boundary = boundary_for(credential)
    check_version(credential.device.version, int(data["device_version"]))
    check_version(boundary.generation, int(data["generation"]))
    if strict(credential.device):
        raise DomainError("STRICT_MODE", "This kiosk requires a patient code for each task.", 409)
    now = timezone.now()
    pending = KioskAssignment.objects.filter(credential=credential, consumed_at__isnull=True)
    if (
        occupied(credential)
        or pending.filter(
            expires_at__gt=now,
            generation=boundary.generation,
        ).exists()
    ):
        raise DomainError(
            "KIOSK_OCCUPIED",
            "Finish the current patient session before assigning another patient.",
            409,
        )
    pending.update(consumed_at=now)
    proof = KioskProof.objects.create(
        patient=patient,
        branch=branch,
        issued_by=request.user,
        membership=member,
        method=data["method"],
        digest=digest(secrets.token_urlsafe(32)),
        expires_at=now + timedelta(minutes=2),
    )
    assignment = KioskAssignment.objects.create(
        credential=credential,
        proof=proof,
        generation=boundary.generation,
        expires_at=proof.expires_at,
    )
    audit(request.user, "station.kiosk.patient.assigned", branch.organization_id, assignment.id)
    return {
        "assigned": True,
        "device": credential.device.name,
        "expires_at": assignment.expires_at.isoformat(),
    }


@transaction.atomic
def receive(request, generation):
    credential = kiosk_device(request)
    boundary = boundary_for(credential)
    if generation != boundary.generation:
        raise DomainError("PATIENT_SESSION_ENDED", "This kiosk was cleared. Start again.", 403)
    if strict(credential.device) or occupied(credential):
        return None
    assignment = (
        KioskAssignment.objects.select_related(
            "proof__patient", "proof__issued_by", "proof__branch__organization"
        )
        .filter(
            credential=credential,
            generation=boundary.generation,
            consumed_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
        .first()
    )
    if not assignment:
        return None
    proof = assignment.proof
    if proof.consumed_at or proof.expires_at <= timezone.now() or not live_source(proof):
        raise DomainError("PATIENT_SESSION_ENDED", "Reception must select the patient again.", 403)
    assignment.consumed_at = timezone.now()
    assignment.save(update_fields=["consumed_at"])
    return open_patient_session(credential, proof)
