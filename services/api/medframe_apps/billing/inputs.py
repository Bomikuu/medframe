from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import Field, StrictBool, StrictInt

from medframe_apps.billing.installment_inputs import InstallmentInput
from medframe_apps.encounters.inputs import Input


class LineInput(Input):
    description: str = Field(min_length=1, max_length=240)
    kind: Literal["consultation", "procedure", "other"] = "consultation"
    quantity: StrictInt = Field(default=1, ge=1, le=999)
    unit_amount: str = Field(max_length=20)
    procedure_id: UUID | None = None
    service_id: UUID | None = None
    service_case_id: UUID | None = None
    service_version: StrictInt = Field(default=0, ge=0)
    override_reason: str = Field(default="", max_length=500)


class DraftInput(Input):
    id: UUID | None = None
    branch_id: UUID
    patient_id: UUID
    encounter_id: UUID | None = None
    due_date: date
    discount_kind: Literal["fixed", "percent"] = "fixed"
    discount_value: str = Field(default="0", max_length=20)
    lines: list[LineInput] = Field(min_length=1, max_length=100)
    installment: InstallmentInput | None = None
    case_id: UUID | None = None
    expected_version: StrictInt = Field(ge=0)


class ActionInput(Input):
    id: UUID
    expected_version: StrictInt = Field(ge=1)
    agreement_confirmed: StrictBool = False
    agreement_digest: str = Field(default="", max_length=64)
    amount: str = Field(default="0", max_length=20)
    payment_id: UUID | None = None
    method: Literal["cash", "bank_transfer", "other"] = "cash"
    reference: str = Field(default="", max_length=120)
    paid_date: date | None = None
    reason: str = Field(default="", max_length=500)
