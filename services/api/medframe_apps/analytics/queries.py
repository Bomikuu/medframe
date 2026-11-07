from datetime import timedelta

from django.db import transaction
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.analytics.periods import report_period
from medframe_apps.auditing.services import audit
from medframe_apps.billing.policy import scoped_branches
from medframe_apps.encounters.models import Encounter
from medframe_apps.expansion_policy import require_native_staff
from medframe_apps.operations.models import Appointment, QueueTicket
from medframe_apps.organizations.policy import permissions_for, require_membership
from medframe_apps.patients.services import scoped_patients


def count_series(query, field, period, days, *, include_status=True):
    """Group at the database boundary; never load patient rows into a report."""
    previous, start, end = period["bounds"]
    query = query.filter(**{f"{field}__gte": previous, f"{field}__lt": end})
    fields = ["report_date", "status"] if include_status else ["report_date"]
    groups = query.annotate(report_date=TruncDate(field, tzinfo=period["zone"])).values(*fields)
    daily, previous_daily, statuses = {}, {}, {}
    current = prior = 0
    for row in groups.annotate(count=Count("id")):
        if row["report_date"] >= period["start"]:
            current += row["count"]
            daily[row["report_date"]] = daily.get(row["report_date"], 0) + row["count"]
            if include_status:
                statuses[row["status"]] = statuses.get(row["status"], 0) + row["count"]
        else:
            prior += row["count"]
            previous_daily[row["report_date"]] = (
                previous_daily.get(row["report_date"], 0) + row["count"]
            )
    return {
        "current": current,
        "previous": prior,
        "statuses": [{"label": key, "count": value} for key, value in sorted(statuses.items())],
        "previous_series": [
            {
                "date": (day := period["previous"] + timedelta(days=offset)).isoformat(),
                "count": previous_daily.get(day, 0),
            }
            for offset in range(days)
        ],
        "series": [
            {
                "date": (day := period["start"] + timedelta(days=offset)).isoformat(),
                "count": daily.get(day, 0),
            }
            for offset in range(days)
        ],
    }


@transaction.atomic
def clinic_insights(
    request, organization_id, branch_id, days=30, *, start_date=None, end_date=None
):
    require_native_staff(request)
    member = require_membership(request.user, organization_id, "workspace.read")
    codes = permissions_for(member)
    if not codes & {
        "operations.read",
        "patients.demographics.read",
        "patients.clinical.read",
        "billing.read",
    }:
        raise DomainError("FORBIDDEN", "Reporting access is required.", 403)
    branch = scoped_branches(member).filter(id=branch_id).first()
    if branch is None:
        raise DomainError("NOT_FOUND", "Choose a permitted clinic branch.", 404)
    period = report_period(member.organization, days, start_date=start_date, end_date=end_date)
    days = period["days"]
    result = {
        "branch_id": str(branch.id),
        "branch": branch.name,
        "timezone": str(period["zone"]),
        "days": days,
        "current_from": period["start"].isoformat(),
        "current_to": (period["end"] - timedelta(days=1)).isoformat(),
        "previous_from": period["previous"].isoformat(),
        "previous_to": (period["start"] - timedelta(days=1)).isoformat(),
        "as_of": timezone.now().isoformat(),
        "operations": None,
        "clinical": None,
        "patients": None,
    }
    if "operations.read" in codes:
        require_membership(request.user, organization_id, "operations.read")
        appointments = Appointment.objects.filter(organization_id=organization_id, branch=branch)
        summary = count_series(appointments, "start", period, days)
        previous, start, end = period["bounds"]
        summary["distinct_current"] = (
            appointments.filter(start__gte=start, start__lt=end)
            .values("patient_id")
            .distinct()
            .count()
        )
        summary["distinct_previous"] = (
            appointments.filter(start__gte=previous, start__lt=start)
            .values("patient_id")
            .distinct()
            .count()
        )
        result["operations"] = {
            "appointments": summary,
            "queue": count_series(
                QueueTicket.objects.filter(day__branch=branch), "created_at", period, days
            ),
        }
    if codes & {"patients.demographics.read", "patients.clinical.read"}:
        permission = (
            "patients.demographics.read"
            if "patients.demographics.read" in codes
            else "patients.clinical.read"
        )
        visible_patients = (
            scoped_patients(request.user, organization_id, permission)
            .filter(branch=branch)
            .distinct()
        )
        result["patients"] = {
            "total": visible_patients.count(),
            "registrations": count_series(
                visible_patients, "created_at", period, days, include_status=False
            ),
        }
    if "patients.clinical.read" in codes:
        patients = scoped_patients(request.user, organization_id, "patients.clinical.read")
        encounters = Encounter.objects.filter(
            organization_id=organization_id, branch=branch, patient_id__in=patients.values("id")
        )
        result["clinical"] = {
            "encounters": count_series(encounters, "created_at", period, days),
            "specialties": [
                {"label": row["provider__specialty"], "count": row["count"]}
                for row in encounters.filter(
                    created_at__gte=period["bounds"][1], created_at__lt=period["bounds"][2]
                )
                .values("provider__specialty")
                .annotate(count=Count("id"))
                .order_by("provider__specialty")
            ],
        }
    audit(request.user, f"analytics.read.{days}", organization_id, branch.id)
    return result
