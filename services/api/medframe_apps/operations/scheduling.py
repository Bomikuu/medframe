from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Q

from config.errors import DomainError
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.operations.events import event
from medframe_apps.operations.inputs import (
    AvailabilityInput,
    OverrideInput,
    ResourceInput,
    ScheduleInput,
    parse,
)
from medframe_apps.operations.models import (
    BranchResource,
    ProviderSchedule,
    Reservation,
    ScheduleOverride,
)
from medframe_apps.operations.policy import require_operations, require_provider_scope
from medframe_apps.organizations.models import Branch


def resolve_local(value, zone):
    if value.tzinfo is not None:
        return value.astimezone(UTC)
    candidates = {
        value.replace(tzinfo=zone, fold=fold).astimezone(UTC)
        for fold in (0, 1)
        if value.replace(tzinfo=zone, fold=fold)
        .astimezone(UTC)
        .astimezone(zone)
        .replace(tzinfo=None)
        == value
    }
    if len(candidates) != 1:
        raise DomainError("INVALID_INPUT", "Choose a valid local time with an explicit UTC offset.")
    return candidates.pop()


def windows(provider, branch, day):
    zone = ZoneInfo(branch.organization.timezone)
    overrides = ScheduleOverride.objects.filter(branch=branch, date=day).filter(
        Q(provider=provider) | Q(provider__isnull=True)
    )
    if overrides.filter(closed=True).exists():
        return []
    chosen = list(overrides.filter(provider=provider)) or list(
        overrides.filter(provider__isnull=True)
    )
    sources = chosen or list(
        ProviderSchedule.objects.filter(
            provider=provider,
            branch=branch,
            weekday=day.weekday(),
            effective_from__lte=day,
            effective_to__gte=day,
            active=True,
        )
    )
    result = []
    for source in sources:
        try:
            start = resolve_local(datetime.combine(day, source.opens), zone)
            end = resolve_local(datetime.combine(day, source.closes), zone)
        except DomainError:
            continue
        if start < end:
            result.append((start, end))
    return result


def in_schedule(provider, branch, start, end):
    day = start.astimezone(ZoneInfo(branch.organization.timezone)).date()
    return any(opens <= start < end <= closes for opens, closes in windows(provider, branch, day))


def resource_for(branch, resource_id):
    if resource_id is None:
        return None
    resource = BranchResource.objects.filter(id=resource_id, branch=branch, active=True).first()
    if resource is None:
        raise DomainError("NOT_FOUND", "This room or chair is unavailable.", 404)
    return resource


def scope(request, org, branch_id, provider_id, permission="operations.read"):
    member = require_operations(request, org, permission, branch_id)
    provider = require_provider_scope(member, provider_id)
    if provider.membership.branch_id and provider.membership.branch_id != branch_id:
        raise DomainError("NOT_FOUND", "The provider does not work in this branch.", 404)
    branch = Branch.objects.select_related("organization").get(id=branch_id)
    return member, provider, branch


def ensure_future_covered(branch, provider=None):
    from django.utils import timezone

    query = Reservation.objects.filter(
        branch=branch, active=True, period__endswith__gt=timezone.now()
    )
    if provider:
        query = query.filter(provider_user_id=provider.membership.user_id)
    for row in query.select_related("appointment__provider", "ticket__provider"):
        profile = row.appointment.provider if row.appointment_id else row.ticket.provider
        if not in_schedule(profile, branch, row.period.lower, row.period.upper):
            raise DomainError(
                "CONFLICT", "This change affects existing reservations. Reschedule them first.", 409
            )


@transaction.atomic
def save_schedule(request, organization_id, data, request_id):
    data = parse(ScheduleInput, data)
    _, provider, branch = scope(
        request, organization_id, data.branch_id, data.provider_id, "schedules.manage"
    )
    advisory_lock(f"operations-provider:{provider.membership.user_id}")
    values = data.model_dump(mode="json")
    previous = replay_request(
        request.user, organization_id, "operations.schedule", request_id, values
    )
    if previous:
        return ProviderSchedule.objects.get(id=previous)
    row = (
        ProviderSchedule.objects.filter(id=data.id, branch=branch, provider=provider).first()
        if data.id
        else None
    )
    if data.id and row is None:
        raise DomainError("NOT_FOUND", "This schedule is unavailable.", 404)
    if row:
        check_version(row.version, data.expected_version)
        row.version += 1
    else:
        row = ProviderSchedule(provider=provider, branch=branch)
    for key in (
        "weekday",
        "effective_from",
        "effective_to",
        "opens",
        "closes",
        "duration",
        "active",
    ):
        setattr(row, key, getattr(data, key))
    row.save()
    ensure_future_covered(branch, provider)
    event(request, branch, row, "schedule.saved", after={"version": row.version})
    record_request_result(
        request.user, organization_id, "operations.schedule", request_id, values, row.id
    )
    return row


@transaction.atomic
def save_resource(request, organization_id, data, request_id):
    data = parse(ResourceInput, data)
    require_operations(request, organization_id, "schedules.manage", data.branch_id)
    branch = Branch.objects.get(id=data.branch_id)
    advisory_lock(f"operations-resource-branch:{branch.id}")
    values = data.model_dump(mode="json")
    previous = replay_request(
        request.user, organization_id, "operations.resource", request_id, values
    )
    if previous:
        return BranchResource.objects.get(id=previous)
    row = (
        BranchResource.objects.select_for_update().filter(id=data.id, branch=branch).first()
        if data.id
        else None
    )
    if data.id and row is None:
        raise DomainError("NOT_FOUND", "This resource is unavailable.", 404)
    if row:
        check_version(row.version, data.expected_version)
        row.version += 1
    else:
        row = BranchResource(branch=branch)
    if not data.active and Reservation.objects.filter(resource=row, active=True).exists():
        raise DomainError(
            "CONFLICT", "Reschedule or complete active resource reservations first.", 409
        )
    row.name, row.active = data.name, data.active
    row.save()
    event(request, branch, row, "resource.saved")
    record_request_result(
        request.user, organization_id, "operations.resource", request_id, values, row.id
    )
    return row


@transaction.atomic
def save_override(request, organization_id, data, request_id):
    data = parse(OverrideInput, data)
    require_operations(request, organization_id, "schedules.manage", data.branch_id)
    branch = Branch.objects.select_related("organization").get(id=data.branch_id)
    advisory_lock(f"operations-branch:{branch.id}")
    provider = None
    if data.provider_id:
        _, provider, _ = scope(
            request, organization_id, branch.id, data.provider_id, "schedules.manage"
        )
    # Serialize with every provider whose reservations a branch closure can affect.
    from medframe_apps.providers.models import ProviderProfile

    for user_id in (
        ProviderProfile.objects.filter(membership__organization_id=organization_id)
        .order_by("membership__user_id")
        .values_list("membership__user_id", flat=True)
        .distinct()
    ):
        advisory_lock(f"operations-provider:{user_id}")
    values = data.model_dump(mode="json")
    previous = replay_request(
        request.user, organization_id, "operations.override", request_id, values
    )
    if previous:
        return ScheduleOverride.objects.get(id=previous)
    row = ScheduleOverride.objects.filter(id=data.id, branch=branch).first() if data.id else None
    if data.id and row is None:
        raise DomainError("NOT_FOUND", "This override is unavailable.", 404)
    if row:
        check_version(row.version, data.expected_version)
        row.version += 1
    else:
        row = ScheduleOverride(branch=branch)
    for key in ("date", "closed", "opens", "closes"):
        setattr(row, key, getattr(data, key))
    row.provider = provider
    row.save()
    ensure_future_covered(branch, provider)
    event(request, branch, row, "override.saved")
    record_request_result(
        request.user, organization_id, "operations.override", request_id, values, row.id
    )
    return row


def slots(provider, branch, data, exclude_appointment=None, patient=None):
    resource = resource_for(branch, data.resource_id)
    reservations = Reservation.objects.filter(active=True).filter(
        Q(provider_user_id=provider.membership.user_id) | Q(resource=resource)
        if resource
        else Q(provider_user_id=provider.membership.user_id)
    )
    if patient:
        reservations = Reservation.objects.filter(active=True).filter(
            Q(id__in=reservations.values("id"))
            | Q(patient=patient, organization=branch.organization)
        )
    if exclude_appointment:
        reservations = reservations.exclude(appointment_id=exclude_appointment)
    zone = ZoneInfo(branch.organization.timezone)
    period_start = datetime.combine(data.date_from, time.min, zone).astimezone(UTC)
    period_end = datetime.combine(data.date_to + timedelta(days=1), time.min, zone).astimezone(UTC)
    occupied = list(
        reservations.filter(period__overlap=(period_start, period_end)).values_list(
            "period", flat=True
        )
    )
    from django.utils import timezone

    now = timezone.now()
    result = []
    day = data.date_from
    while day <= data.date_to:
        for opens, closes in windows(provider, branch, day):
            cursor = opens
            while cursor + timedelta(minutes=data.duration) <= closes:
                end = cursor + timedelta(minutes=data.duration)
                if cursor >= now and not any(
                    row.lower < end and cursor < row.upper for row in occupied
                ):
                    result.append(
                        {
                            "start": cursor.isoformat(),
                            "end": end.isoformat(),
                            "local": cursor.astimezone(zone).isoformat(),
                            "timezone": branch.organization.timezone,
                        }
                    )
                cursor += timedelta(minutes=5)
        day += timedelta(days=1)
    return sorted({item["start"]: item for item in result}.values(), key=lambda item: item["start"])


def available_slots(request, organization_id, data):
    data = parse(AvailabilityInput, data)
    _, provider, branch = scope(request, organization_id, data.branch_id, data.provider_id)
    return slots(provider, branch, data)
