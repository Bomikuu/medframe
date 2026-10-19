from typing import Literal

from django.db import transaction
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.branding.models import OrganizationBranding, UserPreferences
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.organizations.policy import require_membership

WIDGETS = [
    "recent_patients",
    "recent_consultations",
    "draft_notes",
    "pending_treatments",
    "follow_ups",
    "recent_documents",
]


def luminance(color):
    channels = [int(color[index : index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [
        value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4
        for value in channels
    ]
    return sum(
        value * weight for value, weight in zip(linear, [0.2126, 0.7152, 0.0722], strict=True)
    )


def contrast(first, second):
    values = sorted([luminance(first), luminance(second)])
    return (values[1] + 0.05) / (values[0] + 0.05)


class ThemeSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    primary: str = Field(default="#102A43", pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary: str = Field(default="#0EA5A4", pattern=r"^#[0-9A-Fa-f]{6}$")
    accent: str = Field(default="#0D9488", pattern=r"^#[0-9A-Fa-f]{6}$")
    font: Literal["medframe", "manrope", "jakarta", "inter", "source_sans_3", "noto_sans"] = (
        "medframe"
    )
    radius: Literal["square", "subtle", "rounded"] = "subtle"
    density: Literal["comfortable", "compact"] = "comfortable"
    content_width: Literal["contained", "full"] = "contained"
    sidebar_width: int = Field(default=248, ge=224, le=280)
    heading_scale: Literal["small", "medium", "large"] = "medium"
    type_scale: Literal["standard", "large"] = "standard"
    header: Literal["standard", "compact"] = "standard"
    shadow: Literal["none", "subtle"] = "none"
    input_style: Literal["outlined", "filled"] = "outlined"
    button_style: Literal["solid", "outline"] = "solid"
    card_style: Literal["outlined", "flat"] = "outlined"
    logo_id: str | None = None

    @field_validator("primary")
    @classmethod
    def accessible_action(cls, value):
        if contrast(value, "#FFFFFF") < 4.5:
            raise ValueError("Primary action requires readable white text")
        return value.upper()


class PersonalSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mode: Literal["light", "dark", "system"] = "light"
    density: Literal["inherit", "comfortable", "compact"] = "inherit"
    sidebar_collapsed: bool = False
    avatar_id: str | None = None


class Widget(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    visible: bool = True
    size: Literal["standard", "wide"] = "standard"


def validate(model, data):
    try:
        return model.model_validate(data).model_dump()
    except (ValidationError, ValueError):
        raise DomainError(
            "INVALID_INPUT", "Check the appearance values, supported presets, and color contrast."
        ) from None


def default_widgets():
    return [{"id": key, "visible": True, "size": "standard"} for key in WIDGETS]


def read_appearance(user, organization_id):
    require_membership(user, organization_id, "workspace.read")
    branding = OrganizationBranding.objects.filter(organization_id=organization_id).first()
    personal = UserPreferences.objects.filter(user=user, organization_id=organization_id).first()
    return {
        "defaults": {
            "organization": ThemeSettings().model_dump(),
            "personal": PersonalSettings().model_dump(),
            "widgets": default_widgets(),
        },
        "organization": {
            "version": branding.version if branding else 0,
            "settings": validate(ThemeSettings, branding.settings if branding else {}),
        },
        "personal": {
            "version": personal.version if personal else 0,
            "settings": validate(PersonalSettings, personal.settings if personal else {}),
            "widgets": personal.widgets if personal and personal.widgets else default_widgets(),
        },
    }


@transaction.atomic
def save_organization_branding(user, organization_id, data, expected_version):
    require_membership(user, organization_id, "organization.manage")
    settings = validate(ThemeSettings, data)
    if settings["logo_id"]:
        from medframe_apps.documents.services import require_asset

        require_asset(user, organization_id, settings["logo_id"], "logo")
    advisory_lock(f"branding:{organization_id}")
    record = (
        OrganizationBranding.objects.select_for_update()
        .filter(organization_id=organization_id)
        .first()
    )
    check_version(record.version if record else 0, expected_version)
    if record is None:
        record = OrganizationBranding(organization_id=organization_id, version=0)
    record.settings = settings
    record.version += 1
    record.save()
    audit(user, "branding.updated", organization_id, record.id)
    return read_appearance(user, organization_id)


@transaction.atomic
def save_user_preferences(user, organization_id, data, expected_version, widgets=None):
    require_membership(user, organization_id, "workspace.read")
    settings = validate(PersonalSettings, data)
    if settings["avatar_id"]:
        from medframe_apps.documents.services import require_asset

        require_asset(user, organization_id, settings["avatar_id"], "avatar")
    validated_widgets = None
    if widgets is not None:
        if not isinstance(widgets, list) or len(widgets) > len(WIDGETS):
            raise DomainError("INVALID_INPUT", "Choose the supported dashboard widgets.")
        validated_widgets = [validate(Widget, value) for value in widgets]
        keys = [value["id"] for value in validated_widgets]
        if len(set(keys)) != len(keys) or any(key not in WIDGETS for key in keys):
            raise DomainError("INVALID_INPUT", "Widget IDs must be supported and unique.")
    advisory_lock(f"preferences:{user.id}:{organization_id}")
    record = (
        UserPreferences.objects.select_for_update()
        .filter(user=user, organization_id=organization_id)
        .first()
    )
    check_version(record.version if record else 0, expected_version)
    if record is None:
        record = UserPreferences(
            user=user, organization_id=organization_id, version=0, widgets=default_widgets()
        )
    record.settings = settings
    if validated_widgets is not None:
        record.widgets = validated_widgets
    record.version += 1
    record.save()
    audit(user, "preferences.updated", organization_id, record.id)
    return read_appearance(user, organization_id)
