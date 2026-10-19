import hashlib
import re

from django.db import transaction
from django.utils import timezone

from config.crypto import cipher
from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.billing.invoices import validate_input
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.communications.inputs import PreferenceInput, SettingsInput
from medframe_apps.communications.models import CommunicationPreference, CommunicationSettings
from medframe_apps.communications.policy import communication_member, communication_patient
from medframe_apps.portal.models import PortalLink
from medframe_apps.portal.policy import require_portal_link


def preference_details(row, *, portal=False):
    if row is None:
        return {
            "version": 0,
            "recipient": "",
            "recipient_name": "",
            "recipient_user_id": None,
            "sms_enabled": False,
            "in_app_enabled": False,
            "appointments": False,
            "follow_ups": False,
            "billing": False,
            "confirmed_at": None,
        }
    return {
        "version": row.version,
        "recipient": ""
        if portal
        else cipher().decrypt(row.encrypted_recipient.encode()).decode()
        if row.encrypted_recipient
        else "",
        "recipient_name": row.recipient_name,
        "recipient_user_id": str(row.recipient_user_id) if row.recipient_user_id else None,
        "sms_enabled": row.sms_enabled,
        "in_app_enabled": row.in_app_enabled,
        "appointments": row.appointments,
        "follow_ups": row.follow_ups,
        "billing": row.billing,
        "confirmed_at": row.confirmed_at.isoformat(),
    }


@transaction.atomic
def save_preference(request, organization_id, data):
    member = communication_member(request, organization_id)
    parsed = validate_input(PreferenceInput, data)
    communication_patient(member, parsed.branch_id, parsed.patient_id)
    advisory_lock(f"communication-preference:{parsed.patient_id}")
    row = (
        CommunicationPreference.objects.select_for_update()
        .filter(patient_id=parsed.patient_id)
        .first()
    )
    check_version(row.version if row else 0, parsed.expected_version)
    if not parsed.confirmed:
        raise DomainError(
            "INVALID_INPUT", "Confirm recipient identity and their chosen consent settings."
        )
    if parsed.sms_enabled and (
        not re.fullmatch(r"\+[1-9]\d{7,14}", parsed.recipient) or not parsed.recipient_name
    ):
        raise DomainError(
            "INVALID_INPUT",
            "Confirm a named recipient and international phone number, such as +639….",
        )
    if (
        parsed.recipient_user_id
        and not PortalLink.objects.filter(
            user_id=parsed.recipient_user_id,
            patient_id=parsed.patient_id,
            organization_id=organization_id,
            active=True,
            user__is_active=True,
        ).exists()
    ):
        raise DomainError(
            "NOT_FOUND", "Choose an active verified patient or guardian account.", 404
        )
    if parsed.in_app_enabled and not parsed.recipient_user_id:
        raise DomainError(
            "INVALID_INPUT", "Choose a verified portal recipient for in-app reminders."
        )
    row = row or CommunicationPreference(
        organization_id=organization_id, patient_id=parsed.patient_id
    )
    row.encrypted_recipient = (
        cipher().encrypt(parsed.recipient.encode()).decode() if parsed.recipient else ""
    )
    row.recipient_hash = (
        hashlib.sha256(parsed.recipient.encode()).hexdigest() if parsed.recipient else ""
    )
    for key in [
        "recipient_name",
        "sms_enabled",
        "in_app_enabled",
        "appointments",
        "follow_ups",
        "billing",
    ]:
        setattr(row, key, getattr(parsed, key))
    row.recipient_user_id = parsed.recipient_user_id
    row.confirmed_by = request.user
    row.confirmed_at = timezone.now()
    if row.pk and row._state.adding is False:
        row.version += 1
    row.save()
    audit(request.user, "communications.preference_saved", organization_id, row.id)
    return preference_details(row)


@transaction.atomic
def save_settings(request, organization_id, data):
    communication_member(request, organization_id)
    from medframe_apps.organizations.policy import require_membership

    require_membership(request.user, organization_id, "organization.manage")
    parsed = validate_input(SettingsInput, data)
    advisory_lock(f"communication-settings:{organization_id}")
    row = (
        CommunicationSettings.objects.select_for_update()
        .filter(organization_id=organization_id)
        .first()
    )
    check_version(row.version if row else 0, parsed.expected_version)
    if row:
        row.version += 1
    else:
        row = CommunicationSettings(organization_id=organization_id)
    row.appointment_automatic = parsed.appointment_automatic
    row.follow_up_automatic = parsed.follow_up_automatic
    row.updated_by = request.user
    row.save()
    audit(request.user, "communications.settings_saved", organization_id, row.id)
    return {"version": row.version}


def portal_preference(request, link_id):
    link = require_portal_link(request, link_id)
    row = CommunicationPreference.objects.filter(
        patient_id=link.patient_id, recipient_user=request.user
    ).first()
    return preference_details(row, portal=True)


@transaction.atomic
def revoke_preference(request, link_id, expected_version):
    link = require_portal_link(request, link_id, lock=True)
    row = (
        CommunicationPreference.objects.select_for_update()
        .filter(patient_id=link.patient_id, recipient_user=request.user)
        .first()
    )
    if row is None:
        raise DomainError("NOT_FOUND", "No reminder preference is linked to your account.", 404)
    check_version(row.version, expected_version)
    row.sms_enabled = False
    row.in_app_enabled = False
    row.version += 1
    row.save()
    audit(request.user, "communications.opt_out", link.organization_id, row.id)
    return preference_details(row, portal=True)
