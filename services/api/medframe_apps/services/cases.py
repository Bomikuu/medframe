from django.db import transaction

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.billing.invoices import validate_input
from medframe_apps.billing.policy import financial_patient
from medframe_apps.common import check_version
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.services.inputs import CaseInput
from medframe_apps.services.models import PatientServiceCase, ServiceCaseEvent, ServiceCaseStep
from medframe_apps.services.policy import case_record, definition, member
from medframe_apps.services.serialization import case_data, service_data


@transaction.atomic
def case_action(request, organization_id, action, data, request_id):
    actor = member(request, organization_id, "services.work")
    parsed = validate_input(CaseInput, data)
    if action == "create":
        if not parsed.patient_id or not parsed.branch_id or not parsed.service_id:
            raise DomainError("INVALID_INPUT", "Choose patient, branch and service.")
        financial_patient(actor, parsed.branch_id, parsed.patient_id)
    else:
        case_record(actor, parsed.id)
    payload = parsed.model_dump(mode="json")
    previous = replay_request(
        request.user, organization_id, "service-case." + action, request_id, payload
    )
    if previous:
        return case_data(case_record(actor, previous), actor)
    step = None
    if action == "create":
        check_version(0, parsed.expected_version)
        source = definition(actor, parsed.service_id, parsed.branch_id, active=True, lock=True)
        check_version(source.version, parsed.service_version)
        row = PatientServiceCase.objects.create(
            organization_id=organization_id,
            branch_id=parsed.branch_id,
            patient_id=parsed.patient_id,
            service=source,
            service_version=source.version,
            snapshot=service_data(source, prices=True),
            created_by=request.user,
        )
        ServiceCaseStep.objects.bulk_create(
            [
                ServiceCaseStep(case=row, position=i, label=label)
                for i, label in enumerate(source.workflow)
            ]
        )
    else:
        row = case_record(actor, parsed.id, lock=True)
        check_version(row.version, parsed.expected_version)
        if row.status == "cancelled":
            raise DomainError("CONFLICT", "This service was cancelled.", 409)
        if action == "step":
            if row.status != "active":
                raise DomainError("CONFLICT", "This workflow is completed.", 409)
            step = row.steps.filter(id=parsed.step_id).first()
            if step is None:
                raise DomainError("NOT_FOUND", "This workflow step is unavailable.", 404)
            if (
                parsed.status == "skipped"
                or (step.status == "completed" and parsed.status != "completed")
            ) and not parsed.reason:
                raise DomainError("INVALID_INPUT", "Explain the skipped or reopened step.")
            step.status = parsed.status
            step.save(update_fields=["status"])
        elif action == "complete":
            if row.steps.exclude(status__in=["completed", "skipped"]).exists():
                raise DomainError("CONFLICT", "Complete or skip each workflow step first.", 409)
            row.status = "completed"
        elif action == "cancel":
            if not parsed.reason:
                raise DomainError(
                    "INVALID_INPUT", "Enter a cancellation reason. Billing is handled separately."
                )
            row.status = "cancelled"
        else:
            raise DomainError("INVALID_INPUT", "Choose a supported workflow action.")
        row.version += 1
        row.save(update_fields=["status", "version"])
    ServiceCaseEvent.objects.create(
        case=row,
        actor=request.user,
        kind=action,
        version=row.version,
        step=step,
        status=step.status if step else row.status,
        reason=parsed.reason,
    )
    record_request_result(
        request.user, organization_id, "service-case." + action, request_id, payload, row.id
    )
    audit(request.user, "service-case." + action, organization_id, row.id)
    return case_data(row, actor)
