from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from config.errors import DomainError

SECTIONS = ["about", "services", "team", "contact", "queue"]


class Item(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(default="", max_length=100)
    description: str = Field(default="", max_length=1000)
    image_id: UUID | None = None


class Section(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    kind: Literal["about", "services", "team", "contact", "queue"]
    visible: bool = True
    title: str = Field(default="", max_length=120)
    body: str = Field(default="", max_length=4000)
    image_id: UUID | None = None
    items: list[Item] = Field(default_factory=list, max_length=12)


class WebsiteContent(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    clinic_name: str = Field(min_length=1, max_length=160)
    headline: str = Field(default="", max_length=160)
    introduction: str = Field(default="", max_length=1500)
    template: Literal["modern", "editorial"] = "modern"
    palette: Literal["navy", "teal", "forest", "clay"] = "teal"
    logo_id: UUID | None = None
    hero_image_id: UUID | None = None
    phone: str = Field(default="", max_length=40)
    email: str = Field(default="", max_length=160)
    address: str = Field(default="", max_length=500)
    hours: str = Field(default="", max_length=1000)
    portal_cta: bool = True
    seo_title: str = Field(default="", max_length=70)
    seo_description: str = Field(default="", max_length=170)
    indexable: bool = False
    queue_branch_id: UUID | None = None
    sections: list[Section] = Field(default_factory=list, max_length=5)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        if value and ("@" not in value or any(c in value for c in "\r\n <>")):
            raise ValueError("Enter a contact email address")
        return value

    @model_validator(mode="after")
    def unique_sections(self):
        if len({row.kind for row in self.sections}) != len(self.sections):
            raise ValueError("Each section can appear only once")
        return self


def validated(value):
    try:
        return WebsiteContent.model_validate(value).model_dump(mode="json")
    except ValueError:
        raise DomainError(
            "INVALID_INPUT", "Check website fields, image selections and section limits."
        ) from None


def defaults(name):
    return validated(
        {
            "clinic_name": name,
            "sections": [
                {"kind": kind, "title": title, "visible": kind != "queue"}
                for kind, title in [
                    ("about", "About our clinic"),
                    ("services", "Services"),
                    ("team", "Meet the team"),
                    ("contact", "Visit the clinic"),
                    ("queue", "Clinic queue"),
                ]
            ],
        }
    )


def asset_ids(content):
    values = [content.get("logo_id"), content.get("hero_image_id")]
    for section in content.get("sections", []):
        values.append(section.get("image_id"))
        values.extend(item.get("image_id") for item in section.get("items", []))
    return {str(value) for value in values if value}
