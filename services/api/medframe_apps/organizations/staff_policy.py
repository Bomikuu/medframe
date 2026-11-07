"""Membership module settings supplement native roles; they never grant patient records."""

from config.errors import DomainError

BILLING_LEVELS = {
    "none": set(),
    "view": {"billing.read"},
    "record": {"billing.read", "payments.record"},
    "manage": {"billing.read", "payments.record", "billing.manage"},
}
BILLING_CODES = {"billing.read", "payments.record", "billing.manage", "billing.adjust"}
STAFF_ROLES = {"clinic_administrator", "doctor", "dentist", "nurse", "receptionist"}


def effective_permissions(member, codes):
    profile = getattr(member, "staffprofile", None)
    return billing_permissions(codes, profile.billing_access if profile else "inherit")


def billing_permissions(codes, access):
    if access == "inherit":
        return codes
    result = (codes - BILLING_CODES) | BILLING_LEVELS[access]
    if access == "manage" and "billing.adjust" in codes:
        result.add("billing.adjust")
    return result


def enforce_station(member):
    from django.utils import timezone

    from medframe_apps.stations.context import current_request

    profile = getattr(member, "staffprofile", None)
    if not profile or profile.workspace_mode != "station":
        return
    request = current_request.get()
    credential = getattr(request, "station_credential", None) if request else None
    if (
        not credential
        or getattr(request, "station_error", None)
        or credential.revoked
        or credential.expires_at <= timezone.now()
        or credential.device.state != "active"
        or credential.device.mode not in {"clinician", "kiosk"}
        or credential.device.organization_id != member.organization_id
        or (member.branch_id and credential.device.branch_id != member.branch_id)
    ):
        raise DomainError(
            "STATION_REQUIRED",
            "This staff membership works only on an approved Station.",
            403,
        )
