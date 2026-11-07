"""A bounded patient overview for the doctor Station; native scopes remain authoritative."""

from uuid import UUID
from zoneinfo import ZoneInfo

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_POST

from config.errors import DomainError
from config.middleware import domain_view, json_object
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.accounts.throttling import throttle
from medframe_apps.encounters.models import Encounter
from medframe_apps.operations.models import Appointment, QueueTicket
from medframe_apps.operations.policy import require_operations
from medframe_apps.patients.services import require_patient
from medframe_apps.patients.profile_summary import financial_summary
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.stations.policy import clinician_device
from medframe_apps.stations.portraits import current


@require_POST
@domain_view
def patient_workspace(request):
    require_session_realm(request, "staff")
    throttle(request, "station.patient", str(request.user.id), 120, 60)
    data = json_object(request)
    organization_id, patient_id = (
        UUID(str(data.get("organization_id"))),
        UUID(str(data.get("patient_id"))),
    )
    patient = require_patient(request.user, organization_id, patient_id, "patients.clinical.read")
    clinician_device(request, organization_id, patient.branch_id)
    result = {
        "portrait_id": current(request, organization_id, patient_id)["image_id"],
        "consultation_count": Encounter.objects.filter(
            patient=patient, organization_id=organization_id
        ).count(),
        "upcoming": [],
        "queue": None,
        "operations_available": False,
        "financial": None,
        "updated_at": timezone.now().isoformat(),
    }
    provider = ProviderProfile.objects.filter(
        membership__user=request.user,
        membership__organization_id=organization_id,
        membership__active=True,
    ).first()
    if provider:
        try:
            require_operations(request, organization_id, "operations.read", patient.branch_id)
        except DomainError as failure:
            if failure.status not in {401, 403, 404}:
                raise
        else:
            result["operations_available"] = True
            result["upcoming"] = [
                {
                    "id": str(row.id),
                    "start": row.start.isoformat(),
                    "end": row.end.isoformat(),
                    "status": row.status,
                    "reason": row.reason,
                }
                for row in Appointment.objects.filter(
                    patient=patient,
                    branch_id=patient.branch_id,
                    provider=provider,
                    start__gte=timezone.now(),
                    status="booked",
                ).order_by("start", "id")[:4]
            ]
            ticket = (
                QueueTicket.objects.filter(
                    patient=patient,
                    day__branch_id=patient.branch_id,
                    provider=provider,
                    day__date=timezone.localdate(timezone=ZoneInfo(patient.organization.timezone)),
                    status__in=["waiting", "called", "in_service"],
                )
                .select_related("day")
                .order_by("-day__date", "order")
                .first()
            )
            if ticket:
                result["queue"] = {
                    "number": ticket.number,
                    "status": ticket.status,
                    "date": ticket.day.date.isoformat(),
                }
        try:
            result["financial"] = financial_summary(request, patient)
        except DomainError as failure:
            if failure.status not in {401, 403, 404}:
                raise
    return JsonResponse(result)
