from typing import Literal
from uuid import UUID

from pydantic import Field, StrictBool, StrictInt, model_validator

from medframe_apps.billing.calculations import money
from medframe_apps.encounters.inputs import Input


class ServiceInput(Input):
    id: UUID | None = None
    name: str = Field(min_length=1, max_length=160)
    category: str = Field(default="", max_length=80)
    description: str = Field(default="", max_length=1200)
    branch_ids: list[UUID] = Field(min_length=1, max_length=100)
    active: StrictBool = True
    price: str = Field(max_length=20)
    workflow: list[str] = Field(default_factory=list, max_length=40)
    payment_mode: Literal["full", "monthly"] = "full"
    deposit: str = "0"
    months: StrictInt = Field(default=1, ge=1, le=60)
    expected_version: StrictInt = Field(ge=0)

    @model_validator(mode="after")
    def bounded_terms(self):
        if any(not step.strip() or len(step.strip()) > 240 for step in self.workflow):
            raise ValueError("Name each workflow step using at most 240 characters.")
        total, deposit = money(self.price), money(self.deposit)
        if not total or (
            self.payment_mode == "monthly" and (deposit >= total or total - deposit < self.months)
        ):
            raise ValueError("Check price, deposit and monthly installment count.")
        if self.payment_mode == "full" and deposit:
            raise ValueError("A full-payment service has no deposit.")
        return self


class ArchiveInput(Input):
    id: UUID
    expected_version: StrictInt = Field(ge=1)
    active: StrictBool = False


class CaseInput(Input):
    id: UUID | None = None
    service_id: UUID | None = None
    service_version: StrictInt = Field(default=0, ge=0)
    patient_id: UUID | None = None
    branch_id: UUID | None = None
    expected_version: StrictInt = Field(ge=0)
    step_id: UUID | None = None
    status: Literal["pending", "in_progress", "completed", "skipped"] = "pending"
    reason: str = Field(default="", max_length=500)
