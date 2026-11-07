"""Read-only, branch-bound daily clinic workspace with native domain authorization."""

from datetime import datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Q, Sum
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_POST

from config.errors import DomainError
from config.middleware import domain_view, json_object
from medframe_apps.auditing.services import audit
from medframe_apps.billing.calculations import amount_text
from medframe_apps.billing.installment_projection import financial_due_snapshot
from medframe_apps.billing.models import BillingSettings, Payment
from medframe_apps.billing.policy import invoice_scope, scoped_branches, staff_member
from medframe_apps.expansion_policy import require_native_staff
from medframe_apps.operations.portraits import attach_portraits
from medframe_apps.operations.scheduling import windows
from medframe_apps.organizations.policy import permissions_for, require_membership
from medframe_apps.patients.models import Patient
from medframe_apps.patients.services import scoped_patients
from medframe_apps.providers.models import ProviderProfile

from .attention import attention
from .visits import visit_queries, visits


def finance(request, member, branch, day):
    member = staff_member(request, member.organization_id)
    invoices = invoice_scope(member).filter(branch=branch, state="issued")
    balances = financial_due_snapshot(invoices, day)
    payments = {
        row["invoice__currency"]: row["amount"]
        for row in Payment.objects.filter(invoice__in=invoices, paid_date=day)
        .values("invoice__currency")
        .annotate(amount=Sum("amount"))
    }
    currencies = set(balances) | set(payments)
    currencies.add(
        BillingSettings.objects.filter(organization=member.organization)
        .values_list("currency", flat=True)
        .first()
        or "PHP"
    )
    return [
        {
            "currency": currency,
            "collected": amount_text(payments.get(currency, 0)),
            "outstanding": amount_text(balances.get(currency, {}).get("outstanding", 0)),
            "overdue": amount_text(balances.get(currency, {}).get("overdue", 0)),
        }
        for currency in sorted(currencies)
    ]


def provider_hours(request, member, branch, day, codes):
    query = ProviderProfile.objects.filter(
        membership__organization=member.organization,
        membership__active=True,
        membership__user__is_active=True,
    ).filter(Q(membership__branch=branch) | Q(membership__branch__isnull=True))
    if "schedules.manage" not in codes and not member.roles.filter(name="receptionist").exists():
        query = query.filter(membership__user=request.user)
    values = []
    for provider in query.select_related("membership__user").order_by(
        "membership__user__display_name", "id"
    )[:12]:
        hours = windows(provider, branch, day)
        if hours:
            values.append(
                {
                    "provider_id": str(provider.id),
                    "provider": provider.membership.user.display_name,
                    "specialty": provider.specialty,
                    "hours": [
                        {"opens": start.isoformat(), "closes": end.isoformat()}
                        for start, end in hours
                    ],
                }
            )
    return attach_portraits(request, member.organization_id, {"providers": values})["providers"]


@require_POST
@domain_view
@transaction.atomic
def today(request):
    require_native_staff(request)
    body = json_object(request)
    try:
        org_id, branch_id = UUID(str(body.get("organization_id"))), UUID(str(body.get("branch_id")))
    except (ValueError, TypeError, AttributeError):
        raise DomainError("INVALID_INPUT", "Choose a permitted clinic and branch.") from None
    selected, page = body.get("filter", "all"), body.get("page", 1)
    task_page = body.get("task_page", 1)
    if (
        selected not in {"all", "waiting", "in_service", "completed", "scheduled"}
        or type(page) is not int
        or not 1 <= page <= 1000
        or type(task_page) is not int
        or not 1 <= task_page <= 1000
    ):
        raise DomainError("INVALID_INPUT", "Choose a supported daily-work filter and page.")
    member = require_membership(request.user, org_id, "workspace.read")
    codes = permissions_for(member)
    branch = scoped_branches(member).filter(id=branch_id).first()
    if branch is None:
        raise DomainError("NOT_FOUND", "Choose a permitted clinic branch.", 404)
    now = timezone.now()
    zone = ZoneInfo(member.organization.timezone)
    day = now.astimezone(zone).date()
    bounds = (
        datetime.combine(day, time.min, zone),
        datetime.combine(day + timedelta(days=1), time.min, zone),
    )
    clinical = (
        scoped_patients(request.user, org_id, "patients.clinical.read")
        if "patients.clinical.read" in codes
        else Patient.objects.none()
    )
    queries = visit_queries(request, member, branch, day, bounds, codes, clinical)
    result = {
        "date": day.isoformat(),
        "timezone": str(zone),
        "updated_at": now.isoformat(),
        "operations": "operations.read" in codes,
        "clinical": "patients.clinical.read" in codes,
        "visits": visits(request, org_id, queries, selected, page),
        "attention": attention(request, member, branch, day, codes, clinical, task_page),
        "finance": finance(request, member, branch, day) if "billing.read" in codes else None,
        "providers": provider_hours(request, member, branch, day, codes)
        if "operations.read" in codes
        else [],
    }
    audit(request.user, "dashboard.today.read", org_id, branch_id)
    response = JsonResponse(result)
    response["Cache-Control"] = "no-store"
    return response
