from datetime import date, datetime, time
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from config.errors import DomainError


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Duration(Input):
    duration: int = Field(default=30, ge=5, le=240)

    @field_validator("duration")
    @classmethod
    def increments(cls, value):
        if value % 5:
            raise ValueError("Use five-minute increments")
        return value


class ScheduleInput(Duration):
    branch_id: UUID
    provider_id: UUID
    id: UUID | None = None
    expected_version: int = 0
    weekday: int = Field(ge=0, le=6)
    effective_from: date
    effective_to: date
    opens: time
    closes: time
    active: bool = True

    @model_validator(mode="after")
    def window(self):
        if self.opens >= self.closes or self.effective_from > self.effective_to:
            raise ValueError("Use an ordered same-day window and effective dates")
        if self.opens.tzinfo or self.closes.tzinfo:
            raise ValueError("Use local clock times")
        return self


class ResourceInput(Input):
    branch_id: UUID
    name: str = Field(min_length=1, max_length=80)
    id: UUID | None = None
    expected_version: int = 0
    active: bool = True


class OverrideInput(Input):
    branch_id: UUID
    provider_id: UUID | None = None
    date: date
    closed: bool = True
    opens: time | None = None
    closes: time | None = None
    id: UUID | None = None
    expected_version: int = 0

    @model_validator(mode="after")
    def window(self):
        if not self.closed and (
            self.opens is None or self.closes is None or self.opens >= self.closes
        ):
            raise ValueError("Use an ordered same-day override")
        return self


class AvailabilityInput(Duration):
    branch_id: UUID
    provider_id: UUID
    resource_id: UUID | None = None
    date_from: date
    date_to: date

    @model_validator(mode="after")
    def dates(self):
        if not 0 <= (self.date_to - self.date_from).days < 31:
            raise ValueError("Choose up to 31 local dates")
        return self


class BookingInput(Duration):
    branch_id: UUID
    provider_id: UUID
    patient_id: UUID
    resource_id: UUID | None = None
    start: datetime
    type: Literal["routine", "follow_up"] = "routine"
    follow_up_id: UUID | None = None
    reason: str = Field(default="", max_length=240)


class RescheduleInput(Duration):
    start: datetime
    expected_version: int = Field(ge=1)
    reason: str = Field(min_length=1, max_length=240)


class QueueTransitionInput(Input):
    payment_exception_reason: str = Field(default="", max_length=240)
    target: Literal[
        "waiting",
        "called",
        "in_service",
        "completed",
        "cancelled",
        "no_show",
        "delay",
        "extend",
        "recall",
    ]
    expected_version: int = Field(ge=1)
    reason: str = Field(default="", max_length=240)
    minutes: int = Field(default=0, ge=0, le=240)


class WalkInInput(Duration):
    branch_id: UUID
    patient_id: UUID
    provider_id: UUID
    resource_id: UUID | None = None


def parse(schema, data):
    try:
        return schema.model_validate(data)
    except (ValueError, TypeError):
        raise DomainError(
            "INVALID_INPUT", "Check the operation fields, dates and duration."
        ) from None
