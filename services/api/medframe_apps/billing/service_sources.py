from config.errors import DomainError
from medframe_apps.billing.calculations import money
from medframe_apps.billing.models import InvoiceLineServiceSource
from medframe_apps.common import check_version
from medframe_apps.services.policy import definition
from medframe_apps.services.serialization import service_data


def capture_sources(request, member, invoice, lines, previous):
    for line, values in zip(invoice.lines.order_by("position"), lines, strict=True):
        if not values.service_id:
            continue
        retained = previous.get(line.position)
        if values.service_case_id:
            from medframe_apps.services.policy import case_record
            from medframe_apps.services.policy import member as service_member

            case = case_record(
                service_member(request, member.organization_id, "services.work"),
                values.service_case_id,
                lock=True,
            )
            if (
                case.patient_id != invoice.patient_id
                or case.branch_id != invoice.branch_id
                or str(case.service_id) != str(values.service_id)
                or case.service_version != values.service_version
            ):
                raise DomainError("INVALID_INPUT", "Choose the matching patient service.")
            retained = case.snapshot
        if (
            retained
            and str(values.service_id) == retained["id"]
            and values.service_version == retained["version"]
        ):
            snapshot = retained
        else:
            source = definition(
                member, values.service_id, invoice.branch_id, active=True, lock=True
            )
            check_version(source.version, values.service_version)
            snapshot = service_data(source, prices=True)
        if money(values.unit_amount) != money(snapshot["price"]) and not values.override_reason:
            raise DomainError(
                "INVALID_INPUT", "Explain the agreed price change from the service preset."
            )
        snapshot = {
            **snapshot,
            "override_reason": values.override_reason,
            "_case_id": str(values.service_case_id) if values.service_case_id else None,
        }
        if values.quantity != 1:
            raise DomainError("INVALID_INPUT", "Service charges use quantity one.")
        line.description = snapshot["name"]
        line.save(update_fields=["description"])
        InvoiceLineServiceSource.objects.create(
            line=line,
            service_id=values.service_id,
            service_version=values.service_version,
            snapshot=snapshot,
        )
