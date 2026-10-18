from datetime import datetime
from zoneinfo import ZoneInfo

from app.core.errors import DomainError
from app.modules.organizations.models import Organization
from app.modules.patients.schemas import DemographicsInput


def validate_birth_date(data: DemographicsInput, organization: Organization) -> None:
    if (
        data.date_of_birth
        and data.date_of_birth > datetime.now(ZoneInfo(organization.timezone)).date()
    ):
        raise DomainError("INVALID_INPUT", "Date of birth cannot be in the future.")
