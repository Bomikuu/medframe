from config.errors import DomainError
from medframe_apps.billing.policy import financial_patient, scoped_branches, staff_member


def communication_member(request, organization_id):
    return staff_member(request, organization_id, "communications.manage")


def communication_patient(member, branch_id, patient_id):
    return financial_patient(member, branch_id, patient_id)


def source_record(organization_id, branch_id, patient_id, kind, identifier):
    from medframe_apps.billing.models import Invoice
    from medframe_apps.operations.models import Appointment
    from medframe_apps.treatments.models import FollowUp

    models = {"appointment": Appointment, "follow_up": FollowUp, "invoice": Invoice}
    model = models.get(kind)
    if model is None:
        raise DomainError("INVALID_INPUT", "Choose an appointment, follow-up or invoice.")
    query = model.objects.filter(
        id=identifier, organization_id=organization_id, patient_id=patient_id
    )
    query = (
        query.filter(patient__branch_id=branch_id)
        if kind == "follow_up"
        else query.filter(branch_id=branch_id)
    )
    row = query.first()
    if row is None:
        raise DomainError("NOT_FOUND", "This reminder source is unavailable.", 404)
    return row


def source_active(row, kind):
    from medframe_apps.billing.calculations import invoice_totals

    if kind == "appointment":
        return row.status == "booked"
    if kind == "follow_up":
        return row.status == "open"
    return row.state == "issued" and invoice_totals(row)["outstanding"] > 0


def scoped_reminders(member):
    from medframe_apps.communications.models import Reminder

    return Reminder.objects.filter(
        organization_id=member.organization_id, branch_id__in=scoped_branches(member).values("id")
    )
