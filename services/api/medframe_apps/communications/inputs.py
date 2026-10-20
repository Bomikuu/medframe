from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, StrictBool, StrictInt, field_validator

from medframe_apps.encounters.inputs import Input


class PreferenceInput(Input):
    patient_id: UUID
    branch_id: UUID
    recipient: str = Field(default="", max_length=20)
    recipient_name: str = Field(default="", max_length=160)
    recipient_user_id: UUID | None = None
    confirmed: StrictBool = False
    sms_enabled: StrictBool = False
    in_app_enabled: StrictBool = False
    appointments: StrictBool = False
    follow_ups: StrictBool = False
    billing: StrictBool = False
    expected_version: StrictInt = Field(ge=0)


class ReminderInput(Input):
    branch_id: UUID
    patient_id: UUID
    source_kind: Literal["appointment", "follow_up", "invoice"]
    source_id: UUID
    obligation_id: UUID | None = None
    channel: Literal["sms", "in_app"]
    due_at: datetime

    @field_validator("due_at")
    @classmethod
    def aware_time(cls, value):
        if value.tzinfo is None:
            raise ValueError("A timezone is required")
        return value.astimezone(UTC)


class SettingsInput(Input):
    appointment_automatic: StrictBool
    follow_up_automatic: StrictBool
    expected_version: StrictInt = Field(ge=0)


class DeliveryActionInput(Input):
    id: UUID
    expected_version: StrictInt = Field(ge=1)
