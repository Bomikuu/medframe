from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.common import check_version
from medframe_apps.operations.models import QueueTicket
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.stations.context import client_digest, digest
from medframe_apps.stations.models import ConsultationHandoff, EditingLease
from medframe_apps.stations.ownership import LEASE_TIME, locked_encounter, owns
from medframe_apps.stations.pairing import code, normalize
from medframe_apps.stations.policy import clinician_device, event


def providers_for(encounter):
    return (
        ProviderProfile.objects.select_related("membership__user")
        .filter(
            Q(membership__branch_id=encounter.branch_id) | Q(membership__branch__isnull=True),
            membership__organization_id=encounter.organization_id,
            membership__active=True,
            membership__user__is_active=True,
            membership__roles__permissions__codename="encounters.write",
        )
        .distinct()
    )


def require_transferable(encounter, request, provider_id):
    if encounter.status == "finalized" or encounter.provider.membership.user_id != request.user.id:
        raise DomainError(
            "FORBIDDEN", "Only the responsible provider can hand over unfinished care.", 403
        )
    provider = providers_for(encounter).filter(id=provider_id).first()
    if provider is None or provider.membership.user_id == request.user.id:
        raise DomainError("INVALID_INPUT", "Choose another active clinician in this branch.")
    if (
        QueueTicket.objects.filter(encounter=encounter)
        .exclude(status__in=["completed", "cancelled"])
        .exists()
    ):
        raise DomainError(
            "QUEUE_ACTIVE",
            "Resolve the linked active queue ticket before changing clinical responsibility.",
            409,
        )
    return provider


@transaction.atomic
def offer(request, organization_id, encounter_id, data):
    encounter = locked_encounter(request, organization_id, encounter_id)
    lease = EditingLease.objects.select_for_update().filter(encounter=encounter).first()
    if not lease or not owns(request, lease) or lease.locked or lease.expires_at <= timezone.now():
        raise DomainError(
            "OWNERSHIP", "Claim and save this consultation on its editing device first.", 409
        )
    check_version(encounter.version, data.expected_version)
    if encounter.status == "finalized" and not encounter.draft.is_amendment:
        raise DomainError("IMMUTABLE", "Finalized care remains read-only.", 409)
    provider = None
    if data.kind == "responsibility":
        if not data.summary:
            raise DomainError("INVALID_INPUT", "Enter a concise clinical handoff summary.")
        provider = require_transferable(encounter, request, data.provider_id)
    ConsultationHandoff.objects.filter(encounter=encounter, state="pending").update(
        state="cancelled"
    )
    secret = code()
    row = ConsultationHandoff.objects.create(
        encounter=encounter,
        sender=request.user,
        recipient=provider.membership.user if provider else request.user,
        provider=provider,
        kind=data.kind,
        digest=digest(secret),
        expected_version=encounter.version,
        lease_generation=lease.generation,
        summary=data.summary,
        tasks=data.tasks,
        selection=data.selection.model_dump(mode="json"),
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    event(request.user, organization_id, "handoff.offered", encounter=encounter, handoff=row)
    return {"id": str(row.id), "code": secret, "expires_at": row.expires_at.isoformat()}


def lookup(value):
    row = (
        ConsultationHandoff.objects.select_related(
            "encounter", "sender", "recipient", "provider__membership"
        )
        .filter(digest=digest(normalize(value)))
        .first()
    )
    if row is None or row.state != "pending" or row.expires_at <= timezone.now():
        raise DomainError("INVALID_CODE", "This handoff code is invalid, expired or already used.")
    return row


def validate_recipient(request, row):
    from medframe_apps.encounters.services import require_encounter

    encounter = row.encounter
    credential = clinician_device(
        request, encounter.organization_id, encounter.branch_id, required=True, write=True
    )
    if row.recipient_id != request.user.id:
        raise DomainError("FORBIDDEN", "Sign in as the clinician named in this handoff.", 403)
    require_encounter(request.user, encounter.organization_id, encounter.id)
    # Clinical read alone is insufficient to accept editing responsibility.
    from medframe_apps.patients.services import require_patient

    require_patient(
        request.user, encounter.organization_id, encounter.patient_id, "patients.clinical.write"
    )
    return credential


def preview(request, value):
    row = lookup(value)
    validate_recipient(request, row)
    return {
        "kind": row.kind,
        "sender": row.sender.display_name,
        "recipient": row.recipient.display_name,
        "patient": row.encounter.patient.full_name,
        "reason": row.encounter.reason,
        "summary": row.summary,
        "tasks": row.tasks,
        "version": row.expected_version,
        "expires_at": row.expires_at.isoformat(),
    }


@transaction.atomic
def accept(request, value):
    initial = lookup(value)
    credential = validate_recipient(request, initial)
    encounter = locked_encounter(request, initial.encounter.organization_id, initial.encounter_id)
    lease = EditingLease.objects.select_for_update().get(encounter=encounter)
    row = ConsultationHandoff.objects.select_for_update().get(id=initial.id)
    if row.state != "pending" or row.expires_at <= timezone.now():
        raise DomainError("INVALID_CODE", "This handoff was already used or has expired.")
    if (
        lease.generation != row.lease_generation
        or lease.owner_id != row.sender_id
        or lease.locked
        or lease.expires_at <= timezone.now()
        or (
            lease.credential_id
            and (
                lease.credential.revoked
                or lease.credential.expires_at <= timezone.now()
                or lease.credential.device.state != "active"
            )
        )
    ):
        raise DomainError(
            "CONFLICT", "The source device changed ownership. Request a new handoff.", 409
        )
    if lease.client_digest == client_digest(request):
        raise DomainError("SAME_DEVICE", "Accept on the receiving clinician device.", 409)
    check_version(encounter.version, row.expected_version)
    from medframe_apps.encounters.services import require_encounter
    from medframe_apps.organizations.policy import require_membership

    require_membership(row.sender, encounter.organization_id, "encounters.write")
    require_encounter(row.sender, encounter.organization_id, encounter.id)
    if row.kind == "responsibility":
        # Revalidate provider/queue conditions at acceptance, without sender impersonation.
        if (
            encounter.status == "finalized"
            or encounter.provider.membership.user_id != row.sender_id
            or not providers_for(encounter)
            .filter(id=row.provider_id, membership__user=request.user)
            .exists()
            or QueueTicket.objects.filter(encounter=encounter)
            .exclude(status__in=["completed", "cancelled"])
            .exists()
        ):
            raise DomainError(
                "CONFLICT", "Clinical responsibility changed. Request a new handoff.", 409
            )
        encounter.provider = row.provider
        encounter.version += 1
        encounter.updated_at = timezone.now()
        encounter.save(update_fields=["provider", "version", "updated_at"])
    elif encounter.status == "finalized" and not encounter.draft.is_amendment:
        raise DomainError("IMMUTABLE", "This consultation has been finalized.", 409)
    lease.owner = request.user
    lease.client_digest = client_digest(request)
    lease.credential = credential
    lease.expires_at = timezone.now() + LEASE_TIME
    lease.generation += 1
    lease.locked = False
    lease.selection = row.selection
    lease.save()
    row.state, row.accepted_at, row.accepted_credential = "accepted", timezone.now(), credential
    row.save(update_fields=["state", "accepted_at", "accepted_credential"])
    event(
        request.user,
        encounter.organization_id,
        "handoff.accepted",
        encounter=encounter,
        handoff=row,
    )
    return {"encounter_id": str(encounter.id), "organization_id": str(encounter.organization_id)}


@transaction.atomic
def cancel(request, organization_id, encounter_id, identifier):
    encounter = locked_encounter(request, organization_id, encounter_id)
    row = (
        ConsultationHandoff.objects.select_for_update()
        .filter(id=identifier, encounter=encounter, sender=request.user, state="pending")
        .first()
    )
    if not row:
        raise DomainError("NOT_FOUND", "This handoff is no longer pending.", 404)
    row.state = "cancelled"
    row.save(update_fields=["state"])
    event(request.user, organization_id, "handoff.cancelled", encounter=encounter, handoff=row)
