from django.db.models import Q

from config.errors import DomainError
from medframe_apps.billing.policy import scoped_branches
from medframe_apps.organizations.policy import permissions_for
from medframe_apps.record_filters import page_records, parse_filters
from medframe_apps.services.models import PatientServiceCase, ServiceDefinition
from medframe_apps.services.policy import case_record, financial, member
from medframe_apps.services.serialization import case_data, service_data


def catalog_page(request, organization_id, branch_id, filters=None, after=None):
    actor = member(request, organization_id)
    branches = scoped_branches(actor)
    if not branches.filter(id=branch_id).exists():
        raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
    criteria = parse_filters(filters)
    query = ServiceDefinition.objects.filter(
        organization_id=organization_id, branches__id=branch_id
    )
    if criteria.status != "all":
        query = query.filter(active=criteria.status != "archived")
    if criteria.query:
        query = query.filter(
            Q(name__icontains=criteria.query) | Q(category__icontains=criteria.query)
        )
    prices = financial(actor) or "organization.manage" in permissions_for(actor)
    result = page_records(
        query,
        scope=f"services:{actor.id}:{branch_id}:{prices}",
        filters=criteria,
        after=after,
        serialize=lambda row: service_data(row, prices=prices),
    )
    result["branches"] = [{"id": str(x.id), "name": x.name} for x in branches.order_by("name")]
    return result


def case_page(request, organization_id, branch_id, filters=None, patient_id=None, after=None):
    actor = member(request, organization_id)
    if not scoped_branches(actor).filter(id=branch_id).exists():
        raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
    criteria = parse_filters(filters)
    query = PatientServiceCase.objects.filter(
        organization_id=organization_id, branch_id=branch_id
    ).select_related("patient")
    from medframe_apps.stations.context import current_request

    active_request = current_request.get()
    if active_request and (
        getattr(active_request, "station_doctor", None)
        or getattr(active_request, "station_credential", None)
        or active_request.headers.get("X-Medframe-Workspace") == "station"
    ):
        from medframe_apps.patients.services import scoped_patients

        query = query.filter(
            patient_id__in=scoped_patients(
                active_request.user, organization_id, "patients.clinical.read"
            ).values("id")
        )
    if patient_id:
        query = query.filter(patient_id=patient_id)
    if criteria.status and criteria.status != "all":
        query = query.filter(status=criteria.status)
    if criteria.query:
        query = query.filter(
            Q(patient__full_name__icontains=criteria.query)
            | Q(patient__reference__icontains=criteria.query)
            | Q(snapshot__name__icontains=criteria.query)
        )
    return page_records(
        query,
        scope=f"service-cases:{actor.id}:{branch_id}:{patient_id}:{financial(actor)}",
        filters=criteria,
        after=after,
        serialize=lambda row: case_data(row, actor),
    )


def case_detail(request, organization_id, case_id):
    actor = member(request, organization_id)
    return case_data(case_record(actor, case_id), actor)


def service_patients(request, organization_id, branch_id, search=""):
    from medframe_apps.patients.models import Patient

    actor = member(request, organization_id, "services.work")
    if not scoped_branches(actor).filter(id=branch_id).exists():
        raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
    query = Patient.objects.filter(organization_id=organization_id, branch_id=branch_id)
    term = str(search).strip()[:160]
    if term:
        query = query.filter(Q(full_name__icontains=term) | Q(reference__icontains=term))
    return [
        {"id": str(x.id), "name": x.full_name, "reference": x.reference}
        for x in query.order_by("full_name", "id")[:20]
    ]
