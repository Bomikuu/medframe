"""Read-only override impact; the native save rechecks reservations under its locks."""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Q
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.operations.inputs import OverrideInput, parse
from medframe_apps.operations.models import Reservation, ScheduleOverride
from medframe_apps.operations.policy import require_operations
from medframe_apps.operations.scheduling import scope, windows
from medframe_apps.organizations.models import Branch
from medframe_apps.providers.models import ProviderProfile


def override_preview(request, organization_id, values):
    data = parse(OverrideInput, values)
    if data.date == date.max:
        raise DomainError("INVALID_INPUT", "Choose a date before December 31, 9999.")
    require_operations(request, organization_id, "schedules.manage", data.branch_id)
    branch = Branch.objects.select_related("organization").get(id=data.branch_id)
    profiles = ProviderProfile.objects.filter(
        membership__organization_id=organization_id,
        membership__active=True,
        membership__user__is_active=True,
    ).filter(Q(membership__branch=branch) | Q(membership__branch__isnull=True))
    if data.provider_id:
        _, provider, _ = scope(
            request, organization_id, branch.id, data.provider_id, "schedules.manage"
        )
        profiles = profiles.filter(id=provider.id)
    profiles = list(profiles.select_related("membership__user").order_by("id")[:101])
    truncated = len(profiles) > 100
    profiles = profiles[:100]
    zone = ZoneInfo(branch.organization.timezone)
    start = datetime.combine(data.date, time.min, tzinfo=zone)
    end = start + timedelta(days=1)
    proposed = ScheduleOverride(
        branch=branch,
        provider_id=data.provider_id,
        date=data.date,
        closed=data.closed,
        opens=data.opens,
        closes=data.closes,
    )
    reservations = list(
        Reservation.objects.filter(
            branch=branch,
            active=True,
            period__overlap=(start, end),
            period__endswith__gt=timezone.now(),
            provider_user_id__in=[row.membership.user_id for row in profiles],
        )
    )
    rows = []
    for profile in profiles:
        current = windows(profile, branch, data.date)
        preview = windows(profile, branch, data.date, proposed=proposed)
        booked = [row for row in reservations if row.provider_user_id == profile.membership.user_id]
        conflicts = sum(
            not any(
                opens <= row.period.lower < row.period.upper <= closes for opens, closes in preview
            )
            for row in booked
        )

        def labels(hours):
            return [
                f"{opens.astimezone(zone):%H:%M}–{closes.astimezone(zone):%H:%M}"
                for opens, closes in hours
            ]

        rows.append(
            {
                "provider": profile.membership.user.display_name or "Provider",
                "current": labels(current),
                "proposed": labels(preview),
                "reservations": len(booked),
                "conflicts": conflicts,
            }
        )
    return {
        "date": data.date.isoformat(),
        "timezone": str(zone),
        "rows": rows,
        "truncated": truncated,
        "as_of": timezone.now().isoformat(),
    }
