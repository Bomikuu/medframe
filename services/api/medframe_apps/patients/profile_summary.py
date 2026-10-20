"""Read-only profile facts, each section bounded by its existing native policy."""

from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.auditing.services import audit
from medframe_apps.billing.calculations import amount_text
from medframe_apps.billing.models import BillingSettings
from medframe_apps.billing.policy import invoice_scope, scoped_branches, staff_member
from medframe_apps.billing.queries import annotated_invoices
from medframe_apps.encounters.models import Encounter
from medframe_apps.encounters.queries import encounter_summary
from medframe_apps.operations.models import Appointment
from medframe_apps.operations.policy import require_operations
from medframe_apps.organizations.policy import permissions_for
from medframe_apps.patients.services import require_patient
from medframe_apps.stations.models import StationVisit
from medframe_apps.stations.portraits import portrait_map


def clinical_summary(request, patient):
    require_patient(request.user, patient.organization_id, patient.id, "patients.clinical.read")
    query = Encounter.objects.filter(patient=patient, organization=patient.organization)
    recent = query.select_related("patient", "draft", "provider__membership__user").order_by(
        "-created_at", "-id"
    )[:5]
    return {
        "count": query.count(),
        "recent": [encounter_summary(row) for row in recent],
        "portrait_id": portrait_map([patient.id]).get(str(patient.id)),
    }


def operations_summary(request, patient):
    member = require_operations(
        request, patient.organization_id, "operations.read", patient.branch_id
    )
    appointments = Appointment.objects.filter(
        patient=patient,
        branch_id=patient.branch_id,
        start__gte=timezone.now(),
        status="booked",
    ).select_related("provider__membership__user")
    visits = StationVisit.objects.filter(patient=patient, branch_id=patient.branch_id)
    # Match the existing appointment-page and department-board provider visibility.
    if (
        "schedules.manage" not in permissions_for(member)
        and not member.roles.filter(name="receptionist").exists()
    ):
        appointments = appointments.filter(provider__membership__user=request.user)
        visits = (
            visits.filter(stages__isnull=False)
            .filter(
                Q(stages__queue_ticket__isnull=True)
                | Q(stages__queue_ticket__provider__membership__user=request.user)
            )
            .distinct()
        )
    return {
        "appointment_count": appointments.count(),
        "upcoming": [
            {
                "id": str(row.id),
                "start": row.start.isoformat(),
                "status": row.status,
                "provider": row.provider.membership.user.display_name,
            }
            for row in appointments.order_by("start", "id")[:3]
        ],
        "visit_count": visits.count(),
    }


def financial_summary(request, patient):
    member = staff_member(request, patient.organization_id)
    if not scoped_branches(member).filter(id=patient.branch_id).exists():
        raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
    query = annotated_invoices(invoice_scope(member).filter(patient=patient, state="issued"))
    balances = (
        query.values("currency")
        .annotate(
            outstanding=Sum("balance_amount"),
            unpaid_count=Count("id", filter=Q(balance_amount__gt=0)),
        )
        .order_by("currency")
    )
    rows = [
        {
            "currency": row["currency"],
            "outstanding": amount_text(row["outstanding"] or 0),
            "unpaid_count": row["unpaid_count"],
        }
        for row in balances
    ]
    if not rows:
        currency = (
            BillingSettings.objects.filter(organization=patient.organization)
            .values_list("currency", flat=True)
            .first()
            or "PHP"
        )
        rows = [{"currency": currency, "outstanding": "0.00", "unpaid_count": 0}]
    from medframe_apps.billing.installment_projection import financial_due_snapshot

    amounts = financial_due_snapshot(
        query, timezone.localdate(timezone=ZoneInfo(patient.organization.timezone))
    )
    for row in rows:
        row.update(
            {
                key: amount_text(amounts.get(row["currency"], {}).get(key, 0))
                for key in ["due_now", "overdue", "future"]
            }
        )
    return {"balances": rows}


@transaction.atomic
def profile_summary(request, organization_id, patient_id):
    require_session_realm(request, "staff")
    if getattr(request, "station_access", None) or getattr(request, "station_doctor", None):
        raise DomainError(
            "STATION_SCOPE", "Open this summary from your authenticated workstation.", 403
        )
    patient = require_patient(
        request.user, organization_id, patient_id, "patients.demographics.read"
    )
    result = {
        "clinical": None,
        "operations": None,
        "financial": None,
        "timezone": patient.organization.timezone,
    }
    for key, reader in [
        ("clinical", clinical_summary),
        ("operations", operations_summary),
        ("financial", financial_summary),
    ]:
        try:
            result[key] = reader(request, patient)
        except DomainError as error:
            if error.status not in {401, 403, 404}:
                raise
    audit(request.user, "patient.profile_summary.read", organization_id, patient_id)
    return result
