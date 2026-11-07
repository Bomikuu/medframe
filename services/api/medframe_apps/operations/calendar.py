"""Read-only calendar context using native provider and queue authority."""

from datetime import date, timedelta
from zoneinfo import ZoneInfo

from django.db.models import F, Q, Count, Window
from django.db.models.functions import RowNumber, TruncDate
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.operations.models import QueueTicket
from medframe_apps.operations.policy import consultation_setup
from medframe_apps.operations.scheduling import windows
from medframe_apps.operations.serializers import ticket_details
from medframe_apps.organizations.policy import permissions_for
from medframe_apps.providers.models import ProviderProfile


def calendar_dates(filters):
    try:
        start = date.fromisoformat(filters["date"])
        end = date.fromisoformat(filters.get("date_to") or filters["date"])
        if not 0 <= (end - start).days <= 41 or end == date.max:
            raise ValueError()
    except (ValueError, TypeError, KeyError):
        raise DomainError("INVALID_INPUT", "Choose between one and 42 calendar days.") from None
    return start, end


def calendar_context(request, member, branch, filters, items, query=None):
    start, end = calendar_dates(filters)
    providers = ProviderProfile.objects.filter(
        membership__organization_id=member.organization_id,
        membership__active=True,
        membership__user__is_active=True,
    ).filter(Q(membership__branch=branch) | Q(membership__branch__isnull=True))
    if (
        "schedules.manage" not in permissions_for(member)
        and not member.roles.filter(name="receptionist").exists()
    ):
        providers = providers.filter(membership__user=request.user)
    if filters.get("provider_id"):
        providers = providers.filter(id=filters["provider_id"])
    providers = list(providers)
    previews, counts = [], []
    if filters.get("calendar_mode") == "month" and query is not None:
        from medframe_apps.operations.serializers import appointment_details

        day = TruncDate("start", tzinfo=ZoneInfo(branch.organization.timezone))
        counts = [
            {"date": row["calendar_date"].isoformat(), "count": row["count"]}
            for row in query.annotate(calendar_date=day)
            .values("calendar_date")
            .annotate(count=Count("id"))
            .order_by("calendar_date")
        ]
        preview_rows = (
            query.annotate(
                day_position=Window(
                    expression=RowNumber(),
                    partition_by=[day],
                    order_by=[F("start").asc(), F("id").asc()],
                )
            )
            .filter(day_position__lte=3)
            .order_by("start", "id")
        )
        previews = [appointment_details(row) for row in preview_rows]
    tickets = (
        QueueTicket.objects.filter(day__branch=branch, provider__in=providers)
        .filter(
            Q(appointment_id__in=[row["id"] for row in items + previews]) | Q(status="in_service")
        )
        .select_related("day__branch", "patient", "provider__membership__user")
    )

    def details(row):
        value = ticket_details(row)
        value["service_start"] = row.service_start.isoformat() if row.service_start else None
        value["setup_blockers"] = consultation_setup(
            request, member.organization_id, row.patient_id, row.provider_id, branch.id
        )
        return value

    linked, current = {}, []
    for row in tickets:
        value = details(row)
        if row.appointment_id:
            linked[str(row.appointment_id)] = value
        if row.status == "in_service":
            current.append(value)
    for item in items + previews:
        item["ticket"] = linked.get(item["id"])
    hours = []
    for provider in providers:
        if filters.get("calendar_mode") == "month":
            continue
        for offset in range((end - start).days + 1):
            day = start + timedelta(days=offset)
            for opens, closes in windows(provider, branch, day):
                hours.append(
                    {
                        "provider_id": str(provider.id),
                        "date": day.isoformat(),
                        "start": opens.isoformat(),
                        "end": closes.isoformat(),
                    }
                )
    return {
        "hours": hours,
        "in_service": current,
        "updated_at": timezone.now().isoformat(),
        "daily_counts": counts,
        "previews": previews,
    }
