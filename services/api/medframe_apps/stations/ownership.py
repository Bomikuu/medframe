from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.stations.context import client_digest, current_request
from medframe_apps.stations.models import EditingLease
from medframe_apps.stations.policy import clinician_device, event

LEASE_TIME = timedelta(minutes=15)


def authorize_write(encounter, user):
    """Called after the encounter lock, for every existing clinical aggregate write."""
    request = current_request.get()
    if request is not None and (
        getattr(request, "station_credential", None) or getattr(request, "station_error", None)
    ):
        clinician_device(request, encounter.organization_id, encounter.branch_id, write=True)
    lease = EditingLease.objects.select_for_update().filter(encounter=encounter).first()
    if lease is None:
        return
    if request is None:
        raise DomainError("OWNERSHIP", "This consultation is controlled by another device.", 409)
    clinician_device(request, encounter.organization_id, encounter.branch_id, write=True)
    if not owns(request, lease) or lease.locked or lease.expires_at <= timezone.now():
        raise DomainError(
            "OWNERSHIP",
            "Editing is locked or has moved. Your unsaved input is still on this device.",
            409,
        )
    lease.expires_at = timezone.now() + LEASE_TIME
    lease.updated_at = timezone.now()
    lease.save(update_fields=["expires_at", "updated_at"])


def owns(request, lease):
    return lease.owner_id == request.user.id and lease.client_digest == client_digest(request)


def locked_encounter(request, organization_id, encounter_id):
    from medframe_apps.encounters.services import require_encounter

    clinician_device(request, organization_id, _branch(organization_id, encounter_id), write=True)
    return require_encounter(
        request.user, organization_id, encounter_id, write=True, station_check=False
    )


def _branch(organization_id, encounter_id):
    from medframe_apps.encounters.models import Encounter

    branch = (
        Encounter.objects.filter(id=encounter_id, organization_id=organization_id)
        .values_list("branch_id", flat=True)
        .first()
    )
    if not branch:
        raise DomainError("NOT_FOUND", "Consultation is unavailable.", 404)
    return branch


def lease_data(request, encounter, lease):
    mine = bool(lease and owns(request, lease))
    live = bool(lease and lease.expires_at > timezone.now())
    return {
        "mine": mine,
        "live": live,
        "locked": bool(lease and lease.locked),
        "can_edit": bool(mine and live and not lease.locked),
        "owner": lease.owner.display_name if lease else None,
        "device": lease.credential.device.name
        if lease and lease.credential_id
        else "Desktop browser",
        "expires_at": lease.expires_at.isoformat() if lease else None,
        "generation": lease.generation if lease else 0,
        "version": encounter.version,
        "selection": lease.selection if lease else {},
    }


def assign(request, encounter, lease, now):
    lease.owner = request.user
    lease.client_digest = client_digest(request)
    lease.credential = getattr(request, "station_credential", None)
    lease.expires_at = now + LEASE_TIME
    lease.generation += 1
    lease.locked = False
    lease.updated_at = now
    lease.save()


@transaction.atomic
def status(
    request,
    organization_id,
    encounter_id,
    action="status",
    *,
    expected_version=None,
    generation=None,
):
    encounter = locked_encounter(request, organization_id, encounter_id)
    lease = (
        EditingLease.objects.select_for_update(of=("self",))
        .select_related("owner", "credential__device")
        .filter(encounter=encounter)
        .first()
    )
    now = timezone.now()
    if action == "take":
        from medframe_apps.common import check_version

        check_version(encounter.version, expected_version)
        if not lease or lease.owner_id != request.user.id or lease.generation != generation:
            raise DomainError(
                "OWNERSHIP", "Editing control changed. Review the current owner.", 409
            )
        if owns(request, lease):
            raise DomainError("OWNERSHIP", "This device already owns editing control.", 409)
        clinician_device(request, organization_id, encounter.branch_id, required=True, write=True)
        assign(request, encounter, lease, now)
        event(request.user, organization_id, "editor.taken", encounter=encounter)
    elif action == "claim":
        if lease and lease.expires_at > now and not owns(request, lease):
            raise DomainError("OWNERSHIP", "Request a handoff from the active editing device.", 409)
        credential = getattr(request, "station_credential", None)
        if lease is None:
            lease = EditingLease.objects.create(
                encounter=encounter,
                owner=request.user,
                client_digest=client_digest(request),
                credential=credential,
                expires_at=now + LEASE_TIME,
            )
        else:
            lease.owner = request.user
            lease.client_digest = client_digest(request)
            lease.credential = credential
            lease.expires_at = now + LEASE_TIME
            lease.generation += 1
            lease.locked = False
            lease.save()
        event(request.user, organization_id, "editor.claimed", encounter=encounter)
    elif action == "lock":
        if not lease or not owns(request, lease):
            raise DomainError(
                "OWNERSHIP", "Only the editing device can lock this consultation.", 409
            )
        lease.locked = True
        lease.generation += 1
        lease.save(update_fields=["locked", "generation"])
        event(request.user, organization_id, "editor.locked", encounter=encounter)
    elif action != "status":
        raise DomainError("INVALID_INPUT", "Choose status, claim, take or lock.")
    if lease and owns(request, lease) and lease.expires_at > now and not lease.locked:
        lease.expires_at = now + LEASE_TIME
        lease.updated_at = now
        lease.save(update_fields=["expires_at", "updated_at"])
    return lease_data(request, encounter, lease)
