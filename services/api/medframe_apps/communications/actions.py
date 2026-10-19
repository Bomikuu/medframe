from django.db import transaction

from config.errors import DomainError
from medframe_apps.billing.invoices import validate_input
from medframe_apps.communications.inputs import PreferenceInput, SettingsInput
from medframe_apps.communications.models import CommunicationPreference, CommunicationSettings
from medframe_apps.communications.policy import communication_member, communication_patient
from medframe_apps.communications.preferences import (
    preference_details,
    save_preference,
    save_settings,
)
from medframe_apps.communications.reminders import reminder_action
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.organizations.policy import require_membership


@transaction.atomic
def communication_action(request, organization_id, action, data, request_id):
    if action in {"schedule", "cancel", "retry"}:
        return reminder_action(request, organization_id, action, data, request_id)
    member = communication_member(request, organization_id)
    if action not in {"preference", "settings"}:
        raise DomainError("INVALID_INPUT", "Choose a supported communication action.")
    parsed = validate_input(PreferenceInput if action == "preference" else SettingsInput, data)
    if action == "preference":
        communication_patient(member, parsed.branch_id, parsed.patient_id)
    else:
        require_membership(request.user, organization_id, "organization.manage")
    payload = parsed.model_dump(mode="json")
    previous = replay_request(
        request.user, organization_id, f"communications.{action}", request_id, payload
    )
    if previous:
        if action == "preference":
            return preference_details(
                CommunicationPreference.objects.get(
                    id=previous, organization_id=organization_id, patient_id=parsed.patient_id
                )
            )
        return {
            "version": CommunicationSettings.objects.get(
                id=previous, organization_id=organization_id
            ).version
        }
    if action == "preference":
        result = save_preference(request, organization_id, payload)
        row = CommunicationPreference.objects.get(patient_id=parsed.patient_id)
    else:
        result = save_settings(request, organization_id, payload)
        row = CommunicationSettings.objects.get(organization_id=organization_id)
    record_request_result(
        request.user, organization_id, f"communications.{action}", request_id, payload, row.id
    )
    return result
