from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone

from config.errors import DomainError


def report_period(organization, days):
    if type(days) is not int or days not in {7, 30, 90}:
        raise DomainError("INVALID_INPUT", "Choose 7, 30 or 90 completed days.")
    zone = ZoneInfo(organization.timezone)
    today = timezone.now().astimezone(zone).date()
    start = today - timedelta(days=days)
    previous = start - timedelta(days=days)
    return {
        "zone": zone,
        "today": today,
        "start": start,
        "previous": previous,
        "bounds": [datetime.combine(day, time.min, zone) for day in [previous, start, today]],
    }
