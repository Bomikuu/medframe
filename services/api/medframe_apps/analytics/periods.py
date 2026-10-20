from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone

from config.errors import DomainError


def calendar_date(value):
    if type(value) is date:
        return value
    if isinstance(value, str):
        try:
            parsed = date.fromisoformat(value)
            if parsed.isoformat() == value:
                return parsed
        except ValueError:
            pass
    raise DomainError("INVALID_INPUT", "Use a calendar date in YYYY-MM-DD format.")


def report_period(organization, days=30, *, start_date=None, end_date=None):
    zone = ZoneInfo(organization.timezone)
    today = timezone.now().astimezone(zone).date()
    custom = start_date is not None or end_date is not None
    if custom:
        if start_date is None or end_date is None:
            raise DomainError("INVALID_INPUT", "Choose both a start and an end date.")
        start, last = calendar_date(start_date), calendar_date(end_date)
        days = (last - start).days + 1
        if not 1 <= days <= 366 or last >= today:
            raise DomainError(
                "INVALID_INPUT", "Choose 1–366 completed clinic days ending before today."
            )
        end = last + timedelta(days=1)
    else:
        if type(days) is not int or days not in {7, 30, 90}:
            raise DomainError("INVALID_INPUT", "Choose 7, 30 or 90 completed days.")
        end = today
        start = end - timedelta(days=days)
    try:
        previous = start - timedelta(days=days)
    except OverflowError:
        raise DomainError(
            "INVALID_INPUT", "The comparison precedes the supported calendar."
        ) from None
    return {
        "zone": zone,
        "today": today,
        "start": start,
        "end": end,
        "days": days,
        "previous": previous,
        "bounds": [datetime.combine(day, time.min, zone) for day in [previous, start, end]],
    }
