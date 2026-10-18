from django.db import IntegrityError, transaction

from config.errors import DomainError
from medframe_apps.common import advisory_lock
from medframe_apps.operations.models import Reservation
from medframe_apps.operations.scheduling import in_schedule


def claim_reservation(owner, provider, patient, resource, start, end):
    branch = owner.branch if hasattr(owner, "branch") else owner.day.branch
    keys = [
        f"operations-provider:{provider.membership.user_id}",
        f"operations-patient:{patient.id}",
    ]
    if resource:
        keys += [f"operations-resource-branch:{branch.id}"]
    for key in sorted(keys):
        advisory_lock(key)
    if resource:
        resource.refresh_from_db()
        if not resource.active:
            raise DomainError("CONFLICT", "This resource is no longer available.", 409)
    if not in_schedule(provider, branch, start, end):
        raise DomainError(
            "CONFLICT", "The provider is not available for this time. Check the schedule.", 409
        )
    is_appointment = hasattr(owner, "start")
    identity = {"appointment": owner} if is_appointment else {"ticket": owner}
    try:
        with transaction.atomic():
            reservation, _ = Reservation.objects.update_or_create(
                **identity,
                defaults={
                    "organization_id": branch.organization_id,
                    "branch": branch,
                    "provider_user_id": provider.membership.user_id,
                    "patient": patient,
                    "resource": resource,
                    "period": (start, end),
                    "active": True,
                },
            )
            return reservation
    except IntegrityError:
        raise DomainError(
            "CONFLICT",
            "This provider, patient, room or chair is already reserved. Choose another time.",
            409,
        ) from None


def release_reservation(reservation):
    reservation.active = False
    reservation.save(update_fields=["active"])
