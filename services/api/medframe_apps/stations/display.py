"""Display devices receive an allowlist projection, never staff/clinical records."""

import re
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import BooleanField, Case, Exists, F, OuterRef, Value, When
from django.http import JsonResponse
from django.utils import timezone
from django.utils.crypto import salted_hmac
from django.views.decorators.http import require_POST

from config.errors import DomainError
from config.middleware import domain_view, json_object
from medframe_apps.accounts.throttling import throttle
from medframe_apps.common import check_version
from medframe_apps.operations.models import BranchRevision, OperationsEvent, QueueTicket
from medframe_apps.stations.middleware import heartbeat
from medframe_apps.stations.models import (
    DeviceCredential,
    KioskEvent,
    StationDisplaySettings,
    VisitStage,
)
from medframe_apps.stations.policy import administrator


def opaque(kind, value):
    return salted_hmac("station-display:v1", f"{kind}:{value}").hexdigest()[:24]


def settings_data(branch):
    row = StationDisplaySettings.objects.filter(branch=branch).first()
    return {
        "announcements": row.announcements if row else [],
        "version": row.version if row else 0,
    }


def save_settings(request, branch, data):
    administrator(request, branch.organization_id, branch.id)
    row = StationDisplaySettings.objects.select_for_update().filter(branch=branch).first()
    check_version(row.version if row else 0, int(data["expected_version"]))
    notices = data.get("announcements")
    if (
        not isinstance(notices, list)
        or len(notices) > 3
        or any(
            not isinstance(text, str)
            or len(text.strip()) > 240
            or re.search(r"<[^>]*>|https?://", text, re.IGNORECASE)
            for text in notices
        )
    ):
        raise DomainError(
            "INVALID_INPUT", "Use up to three plain-text notices, each up to 240 characters."
        )
    notices = [text.strip() for text in notices if text.strip()]
    if row:
        row.announcements = notices
        row.version += 1
        row.save(update_fields=["announcements", "version"])
    else:
        row = StationDisplaySettings.objects.create(branch=branch, announcements=notices)
    from medframe_apps.stations.kiosk_visits import record

    record(request.user, branch, branch, "display.settings_saved", version=row.version)
    return settings_data(branch)


def live_device(request):
    if getattr(request, "station_error", None):
        raise request.station_error
    credential = getattr(request, "station_credential", None)
    credential = (
        DeviceCredential.objects.select_related("device__branch__organization")
        .filter(
            id=credential.id,
            revoked=False,
            expires_at__gt=timezone.now(),
            device__mode="display",
            device__state="active",
            device__organization__active=True,
        )
        .first()
        if credential
        else None
    )
    if not credential or "queue.display" not in credential.device.functions:
        raise DomainError(
            "DEVICE_UNAVAILABLE", "Pair and approve this queue display with clinic staff.", 403
        )
    if credential.device.organization_id != credential.device.branch.organization_id:
        raise DomainError("DEVICE_UNAVAILABLE", "This display needs clinic review.", 403)
    return credential


def call_token(branch, *, stage=None, ticket=None):
    events = []
    if stage:
        event = (
            KioskEvent.objects.filter(branch=branch, object_id=stage.id, kind="stage.called")
            .order_by("-created_at", "-id")
            .first()
        )
        if event:
            events.append(event)
    if ticket:
        event = (
            OperationsEvent.objects.filter(
                branch=branch, object_id=ticket.id, kind__in=["queue.called", "queue.recall"]
            )
            .order_by("-created_at", "-id")
            .first()
        )
        if event:
            events.append(event)
    event = max(events, key=lambda value: (value.created_at, value.id)) if events else None
    return opaque("call", event.id) if event else None


def snapshot(credential):
    branch = credential.device.branch
    now = timezone.now()
    day = now.astimezone(ZoneInfo(branch.organization.timezone)).date()
    stages = (
        VisitStage.objects.select_related(
            "department", "queue_ticket__provider__membership__user", "queue_ticket__resource"
        )
        .filter(visit__branch=branch, visit__date=day)
        .annotate(
            display_status=Case(
                When(queue_ticket__isnull=False, then=F("queue_ticket__status")),
                default=F("status"),
            ),
            local_priority=Case(
                When(queue_ticket__isnull=True, then=F("priority")),
                default=Value(False),
                output_field=BooleanField(),
            ),
        )
        .order_by(
            "department__name",
            "department_id",
            "-local_priority",
            "queue_ticket__order",
            "created_at",
            "id",
        )
    )
    legacy = (
        QueueTicket.objects.select_related("provider__membership__user", "resource")
        .filter(day__branch=branch, day__date=day)
        .annotate(has_stage=Exists(VisitStage.objects.filter(queue_ticket_id=OuterRef("pk"))))
        .filter(has_stage=False)
        .order_by("order", "created_at", "id")
    )

    def entries(statuses, limit):
        grouped = []
        for stage in stages.filter(display_status__in=statuses)[:limit]:
            ticket = stage.queue_ticket
            grouped.append(
                (
                    stage.department.name,
                    0,
                    {
                        "key": opaque("stage", stage.id),
                        "label": stage.label,
                        "department": stage.department.name,
                        "provider": ticket.provider.membership.user.display_name
                        if ticket
                        else None,
                        "counter": stage.department.counter_label
                        or (ticket.resource.name if ticket and ticket.resource else ""),
                        "status": stage.display_status,
                        "call_token": call_token(branch, stage=stage, ticket=ticket)
                        if stage.display_status == "called"
                        else None,
                    },
                )
            )
        for ticket in legacy.filter(status__in=statuses)[:limit]:
            grouped.append(
                (
                    "Consultation",
                    1,
                    {
                        "key": opaque("queue", ticket.id),
                        "label": f"{ticket.number:03d}",
                        "department": "Consultation",
                        "provider": ticket.provider.membership.user.display_name,
                        "counter": ticket.resource.name if ticket.resource else "",
                        "status": ticket.status,
                        "call_token": call_token(branch, ticket=ticket)
                        if ticket.status == "called"
                        else None,
                    },
                )
            )
        # Stable sorting retains each native queue's order; there is no global rank.
        return [entry for _, _, entry in sorted(grouped, key=lambda item: item[:2])[:limit]]

    revision = (
        BranchRevision.objects.filter(branch=branch).values_list("revision", flat=True).first() or 0
    )
    return {
        "schema_version": 1,
        "clinic": branch.organization.name,
        "branch": branch.name,
        "timezone": branch.organization.timezone,
        "day": day.isoformat(),
        "server_time": now.isoformat(),
        "revision": revision,
        "called": entries(["called", "in_service"], 12),
        "upcoming": entries(["waiting"], 20),
        "announcements": settings_data(branch)["announcements"],
    }


@require_POST
@domain_view
@transaction.atomic
def display(request):
    if json_object(request):
        raise DomainError(
            "INVALID_INPUT", "The approved display determines its own clinic and branch."
        )
    credential = live_device(request)
    throttle(request, "station.display", str(credential.id), 30, 60)
    result = snapshot(credential)
    heartbeat(credential)
    response = JsonResponse(result)
    response["Cache-Control"] = "no-store, private"
    return response
