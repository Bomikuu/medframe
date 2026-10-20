from django.db.models import BigIntegerField, F, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce, Greatest

from config.errors import DomainError
from medframe_apps.billing.calculations import amount_text, invoice_totals
from medframe_apps.billing.models import CreditNote, Invoice, Payment, Refund
from medframe_apps.billing.policy import get_invoice, invoice_scope, scoped_branches, staff_member
from medframe_apps.organizations.policy import permissions_for
from medframe_apps.patients.models import Patient
from medframe_apps.portal.policy import require_portal_link
from medframe_apps.record_filters import filter_dates, page_records, parse_filters


def annotated_invoices(query):
    def total(model, field):
        subquery = (
            model.objects.filter(**{field: OuterRef("pk")})
            .order_by()
            .values(field)
            .annotate(value=Sum("amount"))
            .values("value")
        )
        return Coalesce(
            Subquery(subquery, output_field=BigIntegerField()),
            Value(0),
            output_field=BigIntegerField(),
        )

    return query.annotate(
        paid_amount=total(Payment, "invoice_id"),
        credit_amount=total(CreditNote, "invoice_id"),
        refund_amount=total(Refund, "payment__invoice_id"),
    ).annotate(
        balance_amount=Greatest(
            F("total") - F("credit_amount") - F("paid_amount") + F("refund_amount"),
            Value(0),
            output_field=BigIntegerField(),
        ),
        refundable_amount=Greatest(
            F("paid_amount") - F("refund_amount") - F("total") + F("credit_amount"),
            Value(0),
            output_field=BigIntegerField(),
        ),
    )


def invoice_summary(row, *, portal=False):
    from medframe_apps.billing.installment_projection import invoice_due_projection, serialize_due

    totals = invoice_totals(row)
    return {
        "id": str(row.id),
        "number": row.number,
        "state": row.state,
        "currency": row.currency,
        "patient_id": str(row.patient_id),
        "patient_name": row.patient.full_name,
        "reference": row.patient.reference,
        "branch_id": str(row.branch_id),
        "branch_name": row.branch.name,
        "due_date": row.due_date.isoformat(),
        "version": row.version,
        "created_at": row.created_at.isoformat(),
        "issued_at": row.issued_at.isoformat() if row.issued_at else None,
        "due": serialize_due(invoice_due_projection(row), portal=portal),
        **{
            key: value if key == "payment_status" else amount_text(value)
            for key, value in totals.items()
        },
    }


def invoice_detail(row, *, portal=False):
    from medframe_apps.billing.installment_actions import agreement_review

    result = invoice_summary(row, portal=portal)
    review = agreement_review(row)
    link = row.service_cases.first()
    result["case_id"] = str(link.case_id) if link and not portal else None
    result["installment_plan"] = (
        {key: value for key, value in review.items() if key != "source"}
        if portal and review
        else review
    )
    result.update(
        {
            "discount_kind": row.discount_kind,
            "discount_value": row.discount_value,
            "lines": [
                {
                    "description": line.description,
                    "kind": line.kind,
                    "quantity": line.quantity,
                    "unit_amount": amount_text(line.unit_amount),
                    "line_total": amount_text(line.quantity * line.unit_amount),
                    **(
                        {
                            "service_id": str(line.service_source.service_id),
                            "service_case_id": line.service_source.snapshot.get("_case_id"),
                            "service_version": line.service_source.service_version,
                            "override_reason": line.service_source.snapshot.get(
                                "override_reason", ""
                            ),
                        }
                        if hasattr(line, "service_source") and not portal
                        else {}
                    ),
                }
                for line in row.lines.order_by("position")
            ],
            "payments": [
                {
                    "id": str(payment.id),
                    "amount": amount_text(payment.amount),
                    "method": payment.method,
                    "paid_date": payment.paid_date.isoformat(),
                    "refundable": amount_text(
                        payment.amount
                        - (payment.refunds.aggregate(value=Sum("amount"))["value"] or 0)
                    ),
                    **({} if portal else {"reference": payment.reference}),
                }
                for payment in row.payments.order_by("created_at")
            ],
            "events": [
                {
                    "id": str(event.id),
                    "kind": event.kind,
                    "created_at": event.created_at.isoformat(),
                    "amount": amount_text(event.payload.get("amount", 0)),
                    **(
                        {}
                        if portal
                        else {"reason": event.reason, "actor": event.actor.display_name}
                    ),
                }
                for event in row.events.select_related("actor")
                .exclude(kind="save")
                .order_by("created_at")
            ],
        }
    )
    return result


def billing_setup(request, organization_id, branch_id=None, search=""):
    member = staff_member(request, organization_id)
    branches = scoped_branches(member)
    branch = (
        branches.filter(id=branch_id).first() if branch_id else branches.order_by("name").first()
    )
    if branch is None:
        raise DomainError("NOT_FOUND", "No permitted branch is available.", 404)
    search = str(search)[:160]
    patients = Patient.objects.filter(organization_id=organization_id, branch=branch)
    if search:
        patients = patients.filter(Q(full_name__icontains=search) | Q(reference__icontains=search))
    return {
        "branch_id": str(branch.id),
        "currency": "PHP",
        "timezone": member.organization.timezone,
        "branches": [{"id": str(item.id), "name": item.name} for item in branches.order_by("name")],
        "patients": [
            {"id": str(item.id), "name": item.full_name, "reference": item.reference}
            for item in patients.order_by("full_name")[:50]
        ],
        "permissions": sorted(permissions_for(member)),
    }


def invoice_page(request, organization_id, branch_id, filters=None, after=None, patient_id=None):
    member = staff_member(request, organization_id)
    if not scoped_branches(member).filter(id=branch_id).exists():
        raise DomainError("NOT_FOUND", "This branch is unavailable.", 404)
    criteria = parse_filters(filters)
    query = invoice_scope(member).filter(branch_id=branch_id)
    if patient_id:
        query = query.filter(patient_id=patient_id)
    query = filter_dates(query, criteria, member.organization.timezone)
    if criteria.query:
        query = query.filter(
            Q(number__icontains=criteria.query)
            | Q(patient__full_name__icontains=criteria.query)
            | Q(patient__reference__icontains=criteria.query)
        )
    query = annotated_invoices(query)
    status = criteria.status
    if status in {"draft", "issued", "void"}:
        query = query.filter(state=status)
    elif status in {"unpaid", "partial", "paid", "refund_due"}:
        query = query.filter(state="issued")
        if status == "refund_due":
            query = query.filter(refundable_amount__gt=0)
        elif status == "paid":
            query = query.filter(balance_amount=0, refundable_amount=0)
        elif status == "unpaid":
            query = query.filter(balance_amount__gt=0, paid_amount=F("refund_amount"))
        else:
            query = query.filter(balance_amount__gt=0, paid_amount__gt=F("refund_amount"))
    elif status:
        raise DomainError("INVALID_INPUT", "Choose a supported invoice status.")
    issued = query.filter(state="issued")
    sums = issued.aggregate(
        outstanding=Sum("balance_amount"),
        net_received=Sum(F("paid_amount") - F("refund_amount")),
        refundable=Sum("refundable_amount"),
    )
    result = page_records(
        query.select_related("patient", "branch"),
        scope=f"billing:{organization_id}:{member.id}:{branch_id}:{patient_id}",
        filters=criteria,
        after=after,
        serialize=invoice_summary,
    )
    result["summary"] = {key: amount_text(value or 0) for key, value in sums.items()}
    return result


def staff_invoice(request, organization_id, identifier):
    return invoice_detail(get_invoice(staff_member(request, organization_id), identifier))


def portal_invoices(request, link_id, after=None, invoice_id=None):
    link = require_portal_link(request, link_id)
    query = Invoice.objects.filter(
        organization_id=link.organization_id, patient_id=link.patient_id, state="issued"
    ).select_related("patient", "branch")
    if invoice_id:
        row = query.filter(id=invoice_id).first()
        if row is None:
            raise DomainError("NOT_FOUND", "This statement is unavailable.", 404)
        return invoice_detail(row, portal=True)
    return page_records(
        query,
        scope=f"portal-billing:{link.id}:{request.user.id}",
        after=after,
        serialize=lambda row: invoice_summary(row, portal=True),
    )
