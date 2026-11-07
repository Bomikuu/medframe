"""Fast, device-bound terminal entry; never creates a portal or staff login."""

import secrets
from datetime import timedelta
from uuid import UUID

from django.db.models import Q
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.throttling import refund_attempt, throttle
from medframe_apps.auditing.services import audit
from medframe_apps.operations.policy import operational_patient, require_operations
from medframe_apps.organizations.models import Membership
from medframe_apps.organizations.policy import permissions_for
from medframe_apps.patients.models import Patient
from medframe_apps.portal.models import PortalLink
from medframe_apps.stations.context import digest
from medframe_apps.stations.kiosk_identity import open_patient_session
from medframe_apps.stations.kiosk_reception import boundary_for, occupied, strict
from medframe_apps.stations.models import KioskProof

IDENTIFIER_METHOD = "terminal_identifier"
STAFF_METHOD = "staff_terminal_selection"


def open_terminal(request, credential, data, *, staff=False):
    branch = credential.device.branch
    boundary = boundary_for(credential)
    if int(data.get("generation", -1)) != boundary.generation:
        raise DomainError("PATIENT_SESSION_ENDED", "This terminal was cleared. Start again.", 403)
    if occupied(credential):
        raise DomainError("KIOSK_OCCUPIED", "Finish the current patient session first.", 409)
    if staff:
        member = require_operations(
            request, branch.organization_id, "appointments.manage", branch.id
        )
        throttle(request, "kiosk.staff_select", str(request.user.id), 60, 300)
        patient = operational_patient(member, UUID(str(data["patient_id"])), branch.id)
        method, actor = STAFF_METHOD, request.user
    else:
        if strict(credential.device):
            raise DomainError(
                "STRICT_MODE", "This terminal requires a patient verification code.", 403
            )
        throttle(request, "kiosk.identify", str(credential.id), 5, 300)
        identifier = str(data.get("identifier", "")).strip()
        if not 2 <= len(identifier) <= 254:
            raise DomainError("INVALID_IDENTIFIER", "Enter your exact patient ID or clinic number.")
        matches = Q(reference__iexact=identifier)
        try:
            matches |= Q(id=UUID(identifier))
        except ValueError:
            pass
        if "@" in identifier:
            links = PortalLink.objects.filter(
                organization_id=branch.organization_id,
                patient__branch=branch,
                user__email__iexact=identifier,
                user__is_active=True,
                active=True,
            ).values("patient_id")
            matches |= Q(email__iexact=identifier) | Q(id__in=links)
        patients = list(Patient.objects.filter(branch=branch).filter(matches).distinct()[:2])
        if len(patients) != 1:
            raise DomainError(
                "INVALID_IDENTIFIER",
                "We couldn’t find one patient with those details. Use your exact clinic number or ask reception.",
                400,
            )
        patient = patients[0]
        # This explicit terminal policy is delegated by the device's live clinic approver.
        candidates = (
            Membership.objects.select_related("user")
            .filter(
                user_id=credential.device.approved_by_id,
                user__is_active=True,
                organization_id=branch.organization_id,
                active=True,
            )
            .filter(Q(branch=branch) | Q(branch__isnull=True))
        )
        member = next(
            (row for row in candidates if "appointments.manage" in permissions_for(row)), None
        )
        if member is None:
            raise DomainError(
                "DEVICE_UNAVAILABLE", "Ask your clinic to review this terminal’s approval.", 403
            )
        method, actor = IDENTIFIER_METHOD, member.user
        refund_attempt(request, "kiosk.identify", str(credential.id))
    proof = KioskProof.objects.create(
        patient=patient,
        branch=branch,
        issued_by=actor,
        membership=member,
        method=method,
        digest=digest(secrets.token_urlsafe(32)),
        expires_at=timezone.now() + timedelta(minutes=2),
    )
    # Audit the distinction: identifier entry is not an in-person verification or portal login.
    audit(
        request.user if staff else None, f"station.kiosk.{method}", branch.organization_id, proof.id
    )
    return open_patient_session(credential, proof)
