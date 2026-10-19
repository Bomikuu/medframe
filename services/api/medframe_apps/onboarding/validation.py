import re
from datetime import time
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from config.errors import DomainError

STEPS = ["clinic", "specialties", "branding", "practice", "account", "review"]
TYPES = {
    "dental": "Dental Clinic",
    "general_medicine": "General Medical Clinic",
    "multi_specialty": "Multi-Specialty Clinic",
    "diagnostic": "Diagnostic Center",
    "other": "Other",
}
SPECIALTIES = {
    "dental": [
        "General Dentistry",
        "Orthodontics",
        "Oral Surgery",
        "Endodontics",
        "Periodontics",
        "Pediatric Dentistry",
        "Prosthodontics",
    ],
    "medicine": [
        "General Practice",
        "Family Medicine",
        "Internal Medicine",
        "Pediatrics",
        "Dermatology",
        "Cardiology",
        "Orthopedics",
    ],
}
NOTICE_VERSION = "development-2026-10-19"


class Fields(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Clinic(Fields):
    name: str = Field(default="", max_length=160)
    clinic_type: str = "dental"
    email: str = Field(default="", max_length=320)
    phone: str = Field(default="", max_length=20)
    country: str = Field(default="PH", max_length=2)
    region: str = Field(default="", max_length=100)
    city: str = Field(default="", max_length=100)
    street: str = Field(default="", max_length=255)
    postal_code: str = Field(default="", max_length=20)
    description: str = Field(default="", max_length=2000)


class Specialties(Fields):
    codes: list[str] = Field(default_factory=list, max_length=30)
    custom: str = Field(default="", max_length=80)
    provider_count: Literal["just_me", "2_5", "6_10", "11_20", "20_plus"] = "just_me"
    provider_types: list[Literal["dentist", "physician", "nurse", "medical_assistant", "other"]] = (
        Field(default_factory=list, max_length=5)
    )


class Branding(Fields):
    primary: str = "#0F2D4A"
    secondary: str = "#0EA5A4"
    accent: str = "#22C1B6"
    short_name: str = Field(default="", max_length=40)


class Practice(Fields):
    branch_name: str = Field(default="Main branch", max_length=160)
    days: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4], max_length=7)
    opens: str = "09:00"
    closes: str = "17:00"
    timezone: str = "Asia/Manila"
    duration_minutes: int = Field(default=30, ge=5, le=240)
    walk_in_policy: Literal["walk_ins", "appointments", "both"] = "both"


MODELS = {"clinic": Clinic, "specialties": Specialties, "branding": Branding, "practice": Practice}


def validate_step(step, data, complete=False):
    if step not in MODELS:
        raise DomainError("INVALID_INPUT", "Choose a supported setup step.")
    try:
        parsed = MODELS[step].model_validate(data).model_dump()
        if step == "clinic":
            if parsed["clinic_type"] not in TYPES:
                raise ValueError("clinic_type")
            if complete:
                from django.core.exceptions import ValidationError as EmailValidationError
                from django.core.validators import validate_email

                try:
                    validate_email(parsed["email"])
                except EmailValidationError:
                    raise ValueError("email") from None
                if not parsed["name"] or not re.fullmatch(r"\+[0-9]{7,15}", parsed["phone"]):
                    raise ValueError("name/phone")
        elif step == "specialties":
            from .models import MedicalSpecialty

            if len(set(parsed["codes"])) != len(parsed["codes"]) or len(
                set(parsed["provider_types"])
            ) != len(parsed["provider_types"]):
                raise ValueError("duplicates")
            if MedicalSpecialty.objects.filter(
                code__in=parsed["codes"], active=True
            ).count() != len(parsed["codes"]):
                raise ValueError("specialties")
            if complete and (not parsed["codes"] or not parsed["provider_types"]):
                raise ValueError("specialties/providers")
        elif step == "branding":
            from medframe_apps.branding.services import ThemeSettings

            ThemeSettings.model_validate(
                {key: parsed[key] for key in ["primary", "secondary", "accent"]}
            )
        elif step == "practice":
            ZoneInfo(parsed["timezone"])
            if any(type(day) is not int or not 0 <= day <= 6 for day in parsed["days"]) or len(
                set(parsed["days"])
            ) != len(parsed["days"]):
                raise ValueError("days")
            opening, closing = (
                time.fromisoformat(parsed["opens"]),
                time.fromisoformat(parsed["closes"]),
            )
            if complete and (not parsed["branch_name"] or not parsed["days"] or opening >= closing):
                raise ValueError("hours")
        return parsed
    except (ValidationError, ValueError, TypeError, ZoneInfoNotFoundError):
        raise DomainError(
            "INVALID_INPUT", f"Check the {step} fields, required values and supported choices."
        ) from None
