import hashlib
import json
from datetime import date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.operations.inputs import AvailabilityInput
from medframe_apps.operations.models import Appointment
from medframe_apps.operations.reservations import claim_reservation
from medframe_apps.operations.scheduling import slots
from medframe_apps.stations.kiosk_identity import patient_session
from medframe_apps.stations.kiosk_visits import (
    admit,
    check_in,
    department_for,
    provider_for,
    record,
    ticket_summary,
    today,
)
from medframe_apps.stations.models import KioskRequest, VisitStage


def department_summary(row):
    return {
        "id": str(row.id),
        "name": row.name,
        "kind": row.kind,
        "prefix": row.prefix,
        "duration": row.duration,
        "active": row.active,
        "early_minutes": row.early_minutes,
        "late_minutes": row.late_minutes,
        "version": row.version,
    }


def providers(branch):
    from django.db.models import Q

    from medframe_apps.providers.models import ProviderProfile

    return (
        ProviderProfile.objects.select_related("membership__user")
        .filter(
            membership__organization=branch.organization,
            membership__active=True,
            membership__user__is_active=True,
        )
        .filter(Q(membership__branch=branch) | Q(membership__branch__isnull=True))
        .order_by("membership__user__display_name")
    )


def appointment_summary(row):
    return {
        "id": str(row.id),
        "start": row.start.isoformat(),
        "end": row.end.isoformat(),
        "provider": row.provider.membership.user.display_name,
        "provider_id": str(row.provider_id),
        "status": row.status,
        "version": row.version,
    }


def patient_snapshot(session):
    branch = session.proof.branch
    appointments = (
        Appointment.objects.select_related("provider__membership__user")
        .filter(
            patient=session.proof.patient,
            branch=branch,
            status__in=["booked", "checked_in"],
            end__gte=timezone.now() - timedelta(hours=12),
        )
        .order_by("start")[:25]
    )
    stages = (
        VisitStage.objects.select_related(
            "department", "visit", "queue_ticket__provider__membership__user"
        )
        .filter(
            visit__patient=session.proof.patient, visit__branch=branch, visit__date=today(branch)
        )
        .order_by("created_at")[:30]
    )
    return {
        "appointments": [appointment_summary(row) for row in appointments],
        "tickets": [ticket_summary(row) for row in stages],
    }


def require_task_code(session):
    from medframe_apps.stations.kiosk_reception import strict

    if strict(session.credential.device) and KioskRequest.objects.filter(session=session).exists():
        raise DomainError(
            "REVERIFY_REQUIRED", "Strict mode needs a new patient code for the next task.", 403
        )


def available(session, data):
    require_task_code(session)
    branch = session.proof.branch
    department = department_for(branch, data["department_id"])
    if department.kind != "consultation":
        raise DomainError("INVALID_INPUT", "Appointments are available for consultation services.")
    provider = provider_for(branch, data["provider_id"])
    chosen = date.fromisoformat(data["date"])
    if not today(branch) <= chosen <= today(branch) + timedelta(days=90):
        raise DomainError("INVALID_INPUT", "Choose a date within the next 90 days.")
    parsed = AvailabilityInput(
        branch_id=branch.id,
        provider_id=provider.id,
        date_from=chosen,
        date_to=chosen,
        duration=department.duration,
    )
    return slots(provider, branch, parsed, patient=session.proof.patient)[:200]


@transaction.atomic
def perform(request, data):
    action = data["action"]
    function = {
        "book": "booking",
        "check_in": "check_in",
        "walk_in": "walk_in",
        "cashier": "payments",
    }.get(action)
    if not function:
        raise DomainError("INVALID_INPUT", "Choose an available kiosk action.")
    session = patient_session(request, lock=True, function=function)
    values = {key: value for key, value in data.items() if key != "request_id"}
    fingerprint = hashlib.sha256(
        json.dumps(values, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    request_id = UUID(str(data["request_id"]))
    previous = KioskRequest.objects.filter(session=session, request_id=request_id).first()
    if previous:
        if previous.digest != fingerprint:
            raise DomainError(
                "CONFLICT", "This confirmation changed. Review your selection again.", 409
            )
        return previous.result
    require_task_code(session)
    branch = session.proof.branch
    department = department_for(branch, data["department_id"])
    if action == "book":
        from medframe_apps.common import advisory_lock

        advisory_lock(f"station-booking:{branch.id}:{session.proof.patient_id}")
        provider = provider_for(branch, data["provider_id"])
        start = datetime.fromisoformat(data["start"])
        if not start.tzinfo:
            raise DomainError("INVALID_INPUT", "Choose a clinic time with its timezone.")
        existing = Appointment.objects.filter(
            patient=session.proof.patient,
            branch=branch,
            provider=provider,
            start=start,
            status__in=["booked", "checked_in", "in_service"],
        ).first()
        if existing:
            result = {
                "kind": "appointment",
                "appointment": appointment_summary(existing),
                "message": "Appointment confirmed. This is not admission to today's queue.",
            }
        else:
            options = available(
                session,
                {
                    **data,
                    "date": start.astimezone(ZoneInfo(branch.organization.timezone))
                    .date()
                    .isoformat(),
                },
            )
            if not any(datetime.fromisoformat(option["start"]) == start for option in options):
                raise DomainError(
                    "CONFLICT", "This time is no longer available. Choose another time.", 409
                )
            row = Appointment.objects.create(
                organization=branch.organization,
                branch=branch,
                patient=session.proof.patient,
                provider=provider,
                start=start,
                end=start + timedelta(minutes=department.duration),
                reason=department.name,
                created_by=session.proof.issued_by,
            )
            claim_reservation(row, provider, session.proof.patient, None, row.start, row.end)
            record(
                session.proof.issued_by,
                branch,
                row,
                "appointment.booked",
                session_id=str(session.id),
            )
            result = {
                "kind": "appointment",
                "appointment": appointment_summary(row),
                "message": "Appointment confirmed. This is not admission to today's queue.",
            }
    else:
        if action == "cashier" and department.kind != "cashier":
            raise DomainError("INVALID_INPUT", "Choose the cashier department.")
        if action == "check_in":
            stage = check_in(session, data["appointment_id"], department)
        else:
            provider = (
                provider_for(branch, data.get("provider_id"))
                if department.kind == "consultation"
                else None
            )
            stage = admit(
                branch,
                session.proof.patient,
                department,
                session.proof.issued_by,
                provider=provider,
            )
        result = {
            "kind": "ticket",
            "ticket": ticket_summary(stage),
            "message": "Your queue ticket is ready.",
        }
    KioskRequest.objects.create(
        session=session, request_id=request_id, digest=fingerprint, result=result
    )
    session.last_active_at = timezone.now()
    session.save(update_fields=["last_active_at"])
    return result


def balances(session):
    require_task_code(session)
    from medframe_apps.billing.calculations import amount_text, invoice_totals
    from medframe_apps.billing.models import Invoice

    invoices = []
    for row in Invoice.objects.filter(
        patient=session.proof.patient, branch=session.proof.branch, state="issued"
    ).order_by("-created_at")[:30]:
        total = invoice_totals(row)
        invoices.append(
            {
                "number": row.number,
                "currency": row.currency,
                "total": amount_text(row.total),
                "outstanding": amount_text(total["outstanding"]),
                "paid": amount_text(total["paid"]),
                "status": total["payment_status"],
                "lines": [
                    {
                        "description": line.description,
                        "quantity": line.quantity,
                        "amount": amount_text(line.quantity * line.unit_amount),
                    }
                    for line in row.lines.order_by("position")
                ],
            }
        )
    return {
        "invoices": invoices,
        "digital_available": False,
        "cash_hardware_available": False,
        "instruction": (
            "Pay at the clinic cashier. This kiosk cannot accept or confirm payment yet."
        ),
    }
