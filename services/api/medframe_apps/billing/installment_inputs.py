from datetime import date
from uuid import UUID

from pydantic import Field, StrictInt

from medframe_apps.encounters.inputs import Input


class InstallmentInput(Input):
    case_id: UUID
    deposit: str = "0"
    months: StrictInt = Field(ge=1, le=60)
    deposit_due: date | None = None
    first_due: date
