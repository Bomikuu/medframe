"""Read-only identity photos; native image endpoints still authorize every read."""

from config.errors import DomainError
from medframe_apps.patients.services import scoped_patients
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.stations.portraits import portrait_map


def provider_portrait(provider):
    profile = getattr(provider.membership, "staffprofile", None)
    photo = profile.photo if profile and profile.photo_id else None
    if (
        photo
        and photo.membership_id == provider.membership_id
        and photo.organization_id == provider.membership.organization_id
    ):
        return str(photo.id)
    return None


def patient_portraits(user, organization_id, patient_ids):
    if not patient_ids:
        return {}
    try:
        allowed = (
            scoped_patients(user, organization_id, "patients.clinical.read")
            .filter(id__in=patient_ids)
            .values_list("id", flat=True)
        )
        return portrait_map(allowed)
    except DomainError as failure:
        if failure.code not in {"FORBIDDEN", "NOT_FOUND"}:
            raise
        return {}


def attach_portraits(request, organization_id, payload):
    """Batch-enrich already-authorized staff rows, including month previews and tickets."""
    rows = []

    def collect(value):
        if isinstance(value, dict):
            if "provider_id" in value or "patient_id" in value:
                rows.append(value)
            for child in value.values():
                collect(child)
        elif isinstance(value, list):
            for child in value:
                collect(child)

    collect(payload)
    patients = patient_portraits(
        request.user, organization_id, {row["patient_id"] for row in rows if row.get("patient_id")}
    )
    providers = {
        str(provider.id): provider_portrait(provider)
        for provider in ProviderProfile.objects.filter(
            id__in={row["provider_id"] for row in rows if row.get("provider_id")},
            membership__organization_id=organization_id,
            membership__active=True,
            membership__user__is_active=True,
        ).select_related("membership__staffprofile__photo")
    }
    for row in rows:
        if row.get("patient_id"):
            row["patient_portrait_id"] = patients.get(row["patient_id"])
        if row.get("provider_id"):
            row["provider_photo_id"] = providers.get(row["provider_id"])
    return payload
