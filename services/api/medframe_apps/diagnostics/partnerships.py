from uuid import UUID

from django.db import transaction

from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version
from medframe_apps.diagnostics.models import (
    DiagnosticCenter,
    DiagnosticPartnership,
    PartnershipEvent,
)
from medframe_apps.diagnostics.policy import diagnostic_lock
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.organizations.policy import require_membership


def center_details(center):
    return {
        "id": str(center.id),
        "name": center.name,
        "kind": center.kind,
        "modalities": center.modalities,
        "address": center.address,
        "accepting": center.accepting,
        "version": center.version,
    }


def eligible_centers(row):
    return DiagnosticCenter.objects.filter(
        diagnosticpartnership__organization_id=row.organization_id,
        diagnosticpartnership__active=True,
        organization__active=True,
        accepting=True,
        modalities__contains=[row.details["modality"]],
    ).order_by("name", "id")


@transaction.atomic
def partnership_action(request, organization_id, action, data, request_id):
    require_session_realm(request, "staff")
    require_membership(request.user, organization_id, "diagnostics.partners.manage")
    diagnostic_lock(organization_id)
    if not isinstance(data, dict) or set(data) != {"center_id", "expected_version", "reason"}:
        raise DomainError("INVALID_INPUT", "Choose a center, version and reason.")
    try:
        center_id = UUID(str(data["center_id"]))
    except ValueError:
        raise DomainError("INVALID_INPUT", "Choose a registered center.") from None
    if (
        action not in {"authorize", "suspend"}
        or type(data["expected_version"]) is not int
        or not isinstance(data["reason"], str)
        or not 1 <= len(data["reason"].strip()) <= 240
    ):
        raise DomainError("INVALID_INPUT", "Give a reason of up to 240 characters.")
    center = (
        DiagnosticCenter.objects.filter(id=center_id, organization__active=True)
        .exclude(organization_id=organization_id)
        .first()
    )
    if center is None:
        raise DomainError("NOT_FOUND", "Center is unavailable.", 404)
    operation = "diagnostic.partnership." + action
    previous = replay_request(request.user, organization_id, operation, request_id, data)
    if previous:
        return DiagnosticPartnership.objects.get(id=previous)
    row = (
        DiagnosticPartnership.objects.select_for_update()
        .filter(organization_id=organization_id, center=center)
        .first()
    )
    check_version(row.version if row else 0, data["expected_version"])
    if row is None:
        row = DiagnosticPartnership(organization_id=organization_id, center=center)
    else:
        row.version += 1
    row.active = action == "authorize"
    row.save()
    PartnershipEvent.objects.create(
        partnership=row, actor=request.user, active=row.active, reason=data["reason"].strip()
    )
    record_request_result(request.user, organization_id, operation, request_id, data, row.id)
    audit(request.user, operation, organization_id, row.id)
    return row
