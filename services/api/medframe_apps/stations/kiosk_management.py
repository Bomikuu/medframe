import re
from uuid import UUID, uuid4

from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from config.errors import DomainError
from config.middleware import domain_view, json_object
from medframe_apps.accounts.throttling import throttle
from medframe_apps.common import check_version
from medframe_apps.operations.policy import operational_patient, require_operations
from medframe_apps.organizations.models import Branch
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.models import Patient
from medframe_apps.patients.services import register_patient
from medframe_apps.portal.policy import require_portal_link
from medframe_apps.stations.kiosk_identity import issue
from medframe_apps.stations.kiosk_services import department_summary, providers
from medframe_apps.stations.kiosk_visits import (
    ACTIVE,
    record,
    staff_stage_action,
    ticket_summary,
    today,
)
from medframe_apps.stations.models import KioskIntake, StationDepartment, StationVisit, VisitStage
from medframe_apps.stations.policy import administrator


def bounded(data, key, default, low, high):
    result = int(data.get(key, default))
    if not low <= result <= high:
        raise DomainError("INVALID_INPUT", "Check the service duration and arrival windows.")
    return result


@require_POST
@domain_view
@transaction.atomic
def manage(request):
    data = json_object(request)
    org = UUID(str(data["organization_id"]))
    branch_id = UUID(str(data["branch_id"]))
    action = data.get("action", "snapshot")
    member = require_operations(
        request,
        org,
        "operations.read"
        if action in {"snapshot", "patients"}
        else "appointments.manage"
        if action in {"issue", "review_intake"}
        else "queues.manage",
        branch_id,
    )
    branch = Branch.objects.select_related("organization").get(id=branch_id, organization_id=org)
    throttle(request, "kiosk.manage", str(request.user.id), 120, 60)
    if action == "patients":
        query = str(data.get("query", "")).strip()
        if not 2 <= len(query) <= 160:
            return JsonResponse({"patients": []})
        rows = (
            Patient.objects.filter(branch=branch)
            .filter(Q(full_name__icontains=query) | Q(reference__icontains=query))
            .order_by("full_name")[:20]
        )
        return JsonResponse(
            {
                "patients": [
                    {"id": str(row.id), "name": row.full_name, "reference": row.reference}
                    for row in rows
                ]
            }
        )
    if action == "issue":
        patient = operational_patient(member, UUID(str(data["patient_id"])), branch.id)
        method = str(data.get("method", "")).strip()
        if method not in {"in_person_identity_verified", "existing_clinic_identity_verified"}:
            raise DomainError(
                "IDENTITY_REQUIRED",
                "Verify the patient's identity and record the method before issuing a code.",
            )
        throttle(request, "kiosk.issue", str(request.user.id), 20, 300)
        return JsonResponse(issue(patient, request.user, membership=member, method=method))
    if action in {"initialize", "department"}:
        administrator(request, org, branch.id)
        if action == "initialize":
            for name, prefix, kind in [
                ("Consultation", "C", "consultation"),
                ("Laboratory", "L", "laboratory"),
                ("Cashier", "P", "cashier"),
            ]:
                row, created = StationDepartment.objects.get_or_create(
                    branch=branch, prefix=prefix, defaults={"name": name, "kind": kind}
                )
                if created:
                    record(request.user, branch, row, "department.created")
        else:
            row = (
                StationDepartment.objects.select_for_update()
                .filter(id=data.get("id"), branch=branch)
                .first()
                if data.get("id")
                else StationDepartment(branch=branch)
            )
            if row is None:
                raise DomainError("NOT_FOUND", "This department is unavailable.", 404)
            if row.pk and not row._state.adding:
                check_version(row.version, int(data["expected_version"]))
                row.version += 1
            name = str(data["name"]).strip()
            prefix = str(data["prefix"]).strip().upper()
            kind = data["kind"]
            if (
                not 1 <= len(name) <= 80
                or not re.fullmatch(r"[A-Z]{1,4}", prefix)
                or kind not in {"consultation", "laboratory", "cashier", "other"}
            ):
                raise DomainError(
                    "INVALID_INPUT",
                    "Enter a department name, one-to-four-letter prefix and supported type.",
                )
            if (
                StationDepartment.objects.filter(branch=branch, prefix=prefix)
                .exclude(id=row.id)
                .exists()
            ):
                raise DomainError("CONFLICT", "This ticket prefix is already used.", 409)
            if type(data.get("active", True)) is not bool:
                raise DomainError("INVALID_INPUT", "Use a valid active state.")
            if (
                not row._state.adding
                and row.kind != kind
                and VisitStage.objects.filter(department=row).exists()
            ):
                raise DomainError(
                    "CONFLICT",
                    (
                        "This department already has visit history. Create a new department to "
                        "change its service type."
                    ),
                    409,
                )
            row.name, row.prefix, row.kind, row.active = (
                name,
                prefix,
                kind,
                data.get("active", True),
            )
            row.duration = bounded(data, "duration", 30, 5, 240)
            if row.duration % 5:
                raise DomainError("INVALID_INPUT", "Use a duration in five-minute increments.")
            row.early_minutes = bounded(data, "early_minutes", 60, 0, 240)
            row.late_minutes = bounded(data, "late_minutes", 120, 0, 480)
            row.save()
            record(request.user, branch, row, "department.saved")
    elif action == "stage":
        stage = VisitStage.objects.filter(id=data["stage_id"], visit__branch=branch).first()
        if not stage:
            raise DomainError("NOT_FOUND", "This ticket is unavailable.", 404)
        result = staff_stage_action(request, stage.id, data)
        return JsonResponse({"ticket": ticket_summary(result)})
    elif action == "close_visit":
        visit = StationVisit.objects.filter(
            id=data["visit_id"], branch=branch, state="open"
        ).first()
        if not visit:
            raise DomainError("NOT_FOUND", "This visit is unavailable.", 404)
        from medframe_apps.common import advisory_lock
        from medframe_apps.stations.kiosk_visits import synchronize

        advisory_lock(f"station-visit:{branch.id}:{visit.patient_id}")
        for stage in visit.stages.select_related("queue_ticket").filter(status__in=ACTIVE):
            synchronize(stage)
        if visit.stages.filter(status__in=ACTIVE).exists():
            raise DomainError(
                "CONFLICT", "Complete or cancel active stages before closing the visit.", 409
            )
        visit.state = "closed"
        visit.save(update_fields=["state"])
        record(request.user, branch, visit, "visit.closed")
    elif action == "review_intake":
        intake = (
            KioskIntake.objects.select_for_update()
            .filter(id=data["intake_id"], credential__device__branch=branch)
            .first()
        )
        if not intake or intake.state != "pending":
            raise DomainError("CONFLICT", "This registration request was already reviewed.", 409)
        check_version(intake.version, int(data["expected_version"]))
        if data.get("decision") == "reject":
            intake.state = "rejected"
        elif data.get("patient_id") and data.get("identity_verified") is True:
            intake.patient = operational_patient(member, UUID(str(data["patient_id"])), branch.id)
            intake.state = "linked"
        elif data.get("decision") == "create" and data.get("identity_verified") is True:
            candidates = Patient.objects.filter(organization_id=org).filter(
                Q(phone=intake.phone) | Q(full_name__iexact=intake.full_name)
            )
            if candidates.exists():
                raise DomainError(
                    "MATCH_REVIEW",
                    (
                        "A possible existing patient needs review. Select their record instead of "
                        "creating a duplicate."
                    ),
                    409,
                )
            intake.patient = register_patient(
                request.user,
                org,
                RegisterPatientInput(
                    full_name=intake.full_name,
                    phone=intake.phone,
                    date_of_birth=intake.date_of_birth,
                    branch_id=branch.id,
                    request_id=uuid4(),
                ),
            )
            intake.state = "registered"
        else:
            raise DomainError(
                "IDENTITY_REQUIRED",
                "Verify identity and choose an existing record or confirmed new registration.",
            )
        intake.reviewed_by = request.user
        intake.version += 1
        intake.save()
        record(request.user, branch, intake, "intake.reviewed", decision=intake.state)
        return JsonResponse(
            {
                "state": intake.state,
                "patient_id": str(intake.patient_id) if intake.patient_id else None,
            }
        )
    elif action != "snapshot":
        raise DomainError("INVALID_INPUT", "Choose an available staff action.")
    stages = (
        VisitStage.objects.select_related(
            "visit__patient", "department", "queue_ticket__provider__membership__user"
        )
        .filter(visit__branch=branch, visit__date=today(branch))
        .order_by("-priority", "created_at")[:200]
    )
    tickets = []
    for row in stages:
        # Keep provider-restricted clinicians within their existing queue scope.
        if row.queue_ticket_id:
            from medframe_apps.operations.policy import require_provider_scope

            try:
                require_provider_scope(member, row.queue_ticket.provider_id)
            except DomainError:
                continue
        tickets.append(
            {
                **ticket_summary(row),
                "patient": row.visit.patient.full_name,
                "patient_reference": row.visit.patient.reference,
                "visit_state": row.visit.state,
            }
        )
    intakes = KioskIntake.objects.filter(
        credential__device__branch=branch, state="pending"
    ).order_by("created_at")[:30]
    return JsonResponse(
        {
            "departments": [
                department_summary(row)
                for row in StationDepartment.objects.filter(branch=branch).order_by("name")
            ],
            "providers": [
                {"id": str(row.id), "name": row.membership.user.display_name}
                for row in providers(branch)
            ],
            "tickets": tickets,
            "intakes": [
                {
                    "id": str(row.id),
                    "name": row.full_name,
                    "phone": row.phone,
                    "date_of_birth": row.date_of_birth.isoformat() if row.date_of_birth else None,
                    "version": row.version,
                    "created_at": row.created_at.isoformat(),
                }
                for row in intakes
            ],
            "timezone": branch.organization.timezone,
        }
    )


@require_POST
@domain_view
@transaction.atomic
def portal_code(request):
    data = json_object(request)
    link = require_portal_link(request, UUID(str(data["link_id"])), lock=True)
    throttle(request, "kiosk.portal.issue", str(request.user.id), 10, 300)
    return JsonResponse(issue(link.patient, request.user, link=link, method="verified_portal_link"))
