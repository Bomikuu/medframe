"""Bounded, scope-bound keyset pagination shared by authorized record queries."""

import hashlib
from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core import signing
from django.db.models import Q
from pydantic import BaseModel, ConfigDict, Field, model_validator

from config.errors import DomainError
from medframe_apps.common import check_page


class RecordFilter(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    query: str = Field(default="", max_length=160)
    status: str | None = Field(default=None, max_length=32)
    type: str | None = Field(default=None, max_length=64)
    author_id: UUID | None = None
    date_from: date | None = None
    date_to: date | None = None
    tooth: str | None = None

    @model_validator(mode="after")
    def ordered_dates(self):
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("Date range is reversed")
        return self


def parse_filters(value):
    try:
        return RecordFilter.model_validate(value or {})
    except ValueError:
        raise DomainError("INVALID_INPUT", "Check the record filters and date range.") from None


def filter_dates(queryset, filters, timezone_name, *, field="created_at"):
    try:
        zone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        raise DomainError("UNAVAILABLE", "The clinic timezone needs configuration.", 503) from None
    if filters.date_from:
        start = datetime.combine(filters.date_from, time.min, zone).astimezone(UTC)
        queryset = queryset.filter(**{f"{field}__gte": start})
    if filters.date_to:
        if filters.date_to == date.max:
            raise DomainError("INVALID_INPUT", "Choose a supported date range.")
        stop = datetime.combine(filters.date_to + timedelta(days=1), time.min, zone).astimezone(UTC)
        queryset = queryset.filter(**{f"{field}__lt": stop})
    return queryset


def page_records(queryset, *, scope, filters=None, after=None, first=20, serialize):
    check_page(first)
    criteria = (
        filters.model_dump_json() if isinstance(filters, RecordFilter) else str(filters or "")
    )
    binding = hashlib.sha256((scope + criteria).encode()).hexdigest()
    if after:
        try:
            if not isinstance(after, str) or len(after) > 1024:
                raise ValueError()
            value = signing.loads(after, salt="record-page:v1")
            if value["binding"] != binding:
                raise ValueError()
            timestamp = datetime.fromisoformat(value["at"])
            identifier = UUID(value["id"])
            if timestamp.tzinfo is None:
                raise ValueError()
            queryset = queryset.filter(
                Q(created_at__lt=timestamp) | Q(created_at=timestamp, id__lt=identifier)
            )
        except (ValueError, TypeError, KeyError, signing.BadSignature):
            raise DomainError(
                "INVALID_INPUT", "Reload the list to use a valid page cursor."
            ) from None
    rows = list(queryset.order_by("-created_at", "-id")[: first + 1])
    selected = rows[:first]
    cursor = (
        signing.dumps(
            {
                "binding": binding,
                "at": selected[-1].created_at.isoformat(),
                "id": str(selected[-1].id),
            },
            salt="record-page:v1",
        )
        if selected and len(rows) > first
        else None
    )
    return {
        "items": [serialize(item) for item in selected],
        "end_cursor": cursor,
        "has_next_page": len(rows) > first,
    }
