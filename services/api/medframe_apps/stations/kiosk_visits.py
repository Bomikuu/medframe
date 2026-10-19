"""One patient visit, provider-optional stages, and the existing consultation queue."""

from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.operations.events import bump_branch
from medframe_apps.operations.models import Appointment, QueueTicket
from medframe_apps.operations.policy import require_operations, require_provider_scope
from medframe_apps.operations.queue import ACTIVE, new_ticket, transition_ticket
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.stations.models import (
    DepartmentCounter,
    KioskEvent,
    StationDepartment,
    StationVisit,
    VisitStage,
)


def today(branch):
    return timezone.now().astimezone(ZoneInfo(branch.organization.timezone)).date()


def record(actor, branch, obj, kind, reason="", **details):
    KioskEvent.objects.create(
        actor=actor, branch=branch, object_id=obj.id, kind=kind, reason=reason, details=details
    )
    from medframe_apps.auditing.services import audit

    audit(actor, "station.kiosk." + kind, branch.organization_id, obj.id)
    bump_branch(branch.id, kind)


def department_for(branch, identifier):
    department = StationDepartment.objects.filter(branch=branch, id=identifier, active=True).first()
    if not department:
        raise DomainError("NOT_FOUND", "This service is unavailable. Ask reception.", 404)
    return department


def provider_for(branch, identifier):
    provider = (
        ProviderProfile.objects.select_related("membership__user")
        .filter(
            id=identifier,
            membership__organization=branch.organization,
            membership__active=True,
            membership__user__is_active=True,
        )
        .filter(Q(membership__branch=branch) | Q(membership__branch__isnull=True))
        .first()
    )
    if not provider:
        raise DomainError("NOT_FOUND", "Choose an available clinic provider.", 404)
    return provider


def synchronize(stage):
    advisory_lock(f"station-visit:{stage.visit.branch_id}:{stage.visit.patient_id}")
    stage.refresh_from_db()
    if stage.queue_ticket_id:
        stage.queue_ticket.refresh_from_db()
    if stage.queue_ticket_id and stage.status in ACTIVE:
        current = stage.queue_ticket.status
        mapped = {"no_show": "skipped"}.get(current, current)
        if mapped != stage.status:
            stage.status = mapped
            stage.version += 1
            stage.save(update_fields=["status", "version"])
    return stage


def ticket_summary(stage):
    synchronize(stage)
    return {
        "id": str(stage.id),
        "visit_id": str(stage.visit_id),
        "department_id": str(stage.department_id),
        "department": stage.department.name,
        "label": stage.label,
        "status": stage.status,
        "priority": stage.priority,
        "version": stage.version,
        "issued_at": stage.created_at.isoformat(),
        "next_step": "Wait for your number to be called at " + stage.department.name + ".",
        "queue_number": stage.queue_ticket.number if stage.queue_ticket_id else None,
        "provider": stage.queue_ticket.provider.membership.user.display_name
        if stage.queue_ticket_id
        else None,
        "estimate": None,
    }


@transaction.atomic
def admit(branch, patient, department, actor, *, provider=None, appointment=None, previous=None):
    advisory_lock(f"station-visit:{branch.id}:{patient.id}")
    day = today(branch)
    visit, _ = StationVisit.objects.get_or_create(
        branch=branch, patient=patient, date=day, state="open"
    )
    for stage in visit.stages.select_related("queue_ticket", "department").filter(
        status__in=ACTIVE
    ):
        synchronize(stage)
        if stage.status in ACTIVE:
            if stage.department_id == department.id and (
                not provider
                or not stage.queue_ticket_id
                or stage.queue_ticket.provider_id == provider.id
            ):
                if appointment and (
                    not stage.queue_ticket_id or stage.queue_ticket.appointment_id != appointment.id
                ):
                    raise DomainError(
                        "ACTIVE_STAGE",
                        (
                            "Reception must reconcile your active ticket before checking in this "
                            "appointment."
                        ),
                        409,
                    )
                return stage
            raise DomainError(
                "ACTIVE_STAGE",
                "You already have an active ticket. Ask staff to transfer your visit.",
                409,
            )
    ticket = None
    if department.kind == "consultation":
        if not provider:
            raise DomainError("PROVIDER_REQUIRED", "Choose the consultation provider.")
        if appointment:
            ticket = QueueTicket.objects.filter(appointment=appointment).first()
        if not ticket:
            existing = QueueTicket.objects.filter(
                day__branch=branch, patient=patient, status__in=ACTIVE
            )
            ticket = existing.first()
            if ticket and ticket.day.date != day:
                raise DomainError(
                    "ACTIVE_TICKET", "An earlier consultation ticket needs reception review.", 409
                )
            if ticket and (
                ticket.provider_id != provider.id
                or (appointment and ticket.appointment_id != appointment.id)
            ):
                raise DomainError(
                    "ACTIVE_TICKET",
                    "Reception must reconcile your existing consultation ticket.",
                    409,
                )
        if ticket:
            linked = VisitStage.objects.filter(queue_ticket=ticket).first()
            if linked:
                if linked.visit_id != visit.id:
                    raise DomainError("CONFLICT", "Reception must review your existing visit.", 409)
                return linked
        else:
            ticket = new_ticket(
                SimpleNamespace(user=actor),
                branch,
                patient,
                provider,
                None,
                department.duration,
                appointment,
            )
        if appointment and appointment.status == "booked":
            appointment.status = "checked_in"
            appointment.version += 1
            appointment.save(update_fields=["status", "version"])
    advisory_lock(f"station-department-counter:{department.id}")
    counter, _ = DepartmentCounter.objects.get_or_create(department=department, date=day)
    counter = DepartmentCounter.objects.select_for_update().get(pk=counter.pk)
    number = counter.next_number
    counter.next_number += 1
    counter.save(update_fields=["next_number"])
    stage = VisitStage.objects.create(
        visit=visit,
        department=department,
        number=number,
        label=f"{department.prefix}-{number:03d}",
        queue_ticket=ticket,
        previous=previous,
    )
    record(
        actor,
        branch,
        stage,
        "stage.admitted",
        visit_id=str(visit.id),
        department_id=str(department.id),
    )
    return stage


@transaction.atomic
def check_in(session, appointment_id, department):
    branch = session.proof.branch
    advisory_lock(f"station-visit:{branch.id}:{session.proof.patient_id}")
    row = (
        Appointment.objects.select_for_update()
        .select_related("provider__membership__user")
        .filter(id=appointment_id, patient=session.proof.patient, branch=branch)
        .first()
    )
    if not row or row.status not in {"booked", "checked_in"} or department.kind != "consultation":
        raise DomainError("NOT_FOUND", "Choose your own booked appointment.", 404)
    now = timezone.now()
    if row.start.astimezone(ZoneInfo(branch.organization.timezone)).date() != today(
        branch
    ) or not row.start - timedelta(
        minutes=department.early_minutes
    ) <= now <= row.start + timedelta(minutes=department.late_minutes):
        raise DomainError(
            "ARRIVAL_WINDOW",
            "This appointment is outside the kiosk arrival window. Ask reception.",
            409,
        )
    provider_for(branch, row.provider_id)
    return admit(
        branch,
        session.proof.patient,
        department,
        session.proof.issued_by,
        provider=row.provider,
        appointment=row,
    )


@transaction.atomic
def staff_stage_action(request, stage_id, data):
    stage = VisitStage.objects.select_related(
        "visit__branch__organization",
        "visit__patient",
        "department",
        "queue_ticket__provider__membership__user",
    ).get(id=stage_id)
    branch = stage.visit.branch
    member = require_operations(request, branch.organization_id, "queues.manage", branch.id)
    # Same visit lock order as public admission; no stage/patient lock inversion.
    advisory_lock(f"station-visit:{branch.id}:{stage.visit.patient_id}")
    stage = (
        VisitStage.objects.select_for_update(of=("self",))
        .select_related(
            "visit__branch__organization",
            "visit__patient",
            "department",
            "queue_ticket__provider__membership__user",
        )
        .get(id=stage.id)
    )
    synchronize(stage)
    check_version(stage.version, int(data["expected_version"]))
    if stage.queue_ticket_id:
        require_provider_scope(member, stage.queue_ticket.provider_id)
    action = data["target"]
    reason = str(data.get("reason", "")).strip()
    if len(reason) > 240 or (
        action in {"skipped", "cancelled", "priority", "transfer"} and not reason
    ):
        raise DomainError("INVALID_INPUT", "Record a short reason for this action.")
    if action == "transfer" and stage.status == "transferred":
        return VisitStage.objects.get(previous=stage)
    if stage.status not in ACTIVE and action != "transfer":
        raise DomainError("CONFLICT", "This ticket is no longer active.", 409)
    if action == "priority":
        stage.priority = not stage.priority
        if stage.queue_ticket_id:
            advisory_lock(f"operations-queue-day:{branch.id}")
            from django.db.models import Min

            order = (
                QueueTicket.objects.filter(day=stage.queue_ticket.day, status__in=ACTIVE).aggregate(
                    value=Min("order")
                )["value"]
                or 0
            )
            stage.queue_ticket.order = (
                order - 1024
                if stage.priority
                else (
                    QueueTicket.objects.filter(day=stage.queue_ticket.day).aggregate(
                        value=Max("order")
                    )["value"]
                    or 0
                )
                + 1024
            )
            stage.queue_ticket.version += 1
            stage.queue_ticket.save(update_fields=["order", "version"])
    else:
        allowed = {
            "waiting": {"called", "skipped", "cancelled", "transfer"},
            "called": {"called", "waiting", "in_service", "skipped", "cancelled", "transfer"},
            "in_service": {"completed", "transfer"},
            "completed": {"transfer"},
            "skipped": {"transfer"},
        }
        if action not in allowed.get(stage.status, set()):
            raise DomainError(
                "CONFLICT", "This action is not available for the current stage.", 409
            )
        if stage.queue_ticket_id and not (action == "called" and stage.status == "called"):
            target = {
                "skipped": "no_show",
                "transfer": "completed"
                if stage.queue_ticket.status == "in_service"
                else "cancelled",
            }.get(action, action)
            if stage.queue_ticket.status in ACTIVE:
                transition_ticket(
                    request,
                    stage.queue_ticket_id,
                    {
                        "target": target,
                        "expected_version": stage.queue_ticket.version,
                        "reason": reason or "Department workflow",
                    },
                    uuid4(),
                )
        stage.status = "transferred" if action == "transfer" else action
    stage.version += 1
    stage.save(update_fields=["status", "version", "priority"])
    record(request.user, branch, stage, "stage." + action, reason)
    if action == "transfer":
        destination = department_for(branch, data["department_id"])
        if destination.id == stage.department_id:
            raise DomainError("INVALID_INPUT", "Choose another department.")
        provider = (
            provider_for(branch, data.get("provider_id"))
            if destination.kind == "consultation"
            else None
        )
        if provider:
            require_provider_scope(member, provider.id)
        return admit(
            branch,
            stage.visit.patient,
            destination,
            request.user,
            provider=provider,
            previous=stage,
        )
    return stage
