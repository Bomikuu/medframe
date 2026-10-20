from django.db import transaction

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.billing.calculations import money
from medframe_apps.billing.invoices import validate_input
from medframe_apps.billing.policy import scoped_branches
from medframe_apps.common import check_version
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.services.inputs import ArchiveInput, ServiceInput
from medframe_apps.services.models import ServiceDefinition
from medframe_apps.services.policy import definition, member
from medframe_apps.services.serialization import service_data


@transaction.atomic
def catalog_action(request, organization_id, action, data, request_id):
    actor = member(request, organization_id, "organization.manage")
    if action not in {"save", "archive"}:
        raise DomainError("INVALID_INPUT", "Choose save or archive.")
    parsed = validate_input(ServiceInput if action == "save" else ArchiveInput, data)
    if parsed.id:
        definition(actor, parsed.id)
    payload = parsed.model_dump(mode="json")
    previous = replay_request(
        request.user, organization_id, "services." + action, request_id, payload
    )
    if previous:
        return service_data(definition(actor, previous), prices=True)
    row = (
        definition(actor, parsed.id, lock=True)
        if parsed.id
        else ServiceDefinition(organization_id=organization_id)
    )
    check_version(row.version if parsed.id else 0, parsed.expected_version)
    if action == "save":
        branch_ids = set(parsed.branch_ids)
        if (
            set(scoped_branches(actor).filter(id__in=branch_ids).values_list("id", flat=True))
            != branch_ids
        ):
            raise DomainError("NOT_FOUND", "Choose permitted clinic branches.", 404)
        for field in ["name", "category", "description", "active", "payment_mode", "months"]:
            setattr(row, field, getattr(parsed, field))
        row.price, row.deposit = money(parsed.price), money(parsed.deposit)
        row.workflow = [value.strip() for value in parsed.workflow]
        if parsed.id:
            row.version += 1
        row.save()
        row.branches.set(branch_ids)
    else:
        row.active = parsed.active
        row.version += 1
        row.save(update_fields=["active", "version"])
    record_request_result(
        request.user, organization_id, "services." + action, request_id, payload, row.id
    )
    audit(request.user, "services." + action, organization_id, row.id)
    return service_data(row, prices=True)
