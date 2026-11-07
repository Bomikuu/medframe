"""Pending patient intake and explicit, scoped clinic acceptance."""

import secrets
from datetime import date, datetime
from typing import Literal
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from config.errors import DomainError
from config.runtime import get_settings
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.auditing.services import audit
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.organizations.models import Branch
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.models import Patient
from medframe_apps.patients.services import register_patient, require_patient, scoped_patients
from medframe_apps.portal.invitations import issue_invitation
from medframe_apps.portal.registration_contact import application_status, session_hash
from medframe_apps.portal.registration_models import (
    PatientApplication,
    RegistrationContact,
    RegistrationEntry,
)


class ApplicationInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    email: str = Field(default="", max_length=254)
    full_name: str = Field(min_length=2, max_length=160)
    date_of_birth: date | None = None
    sex: Literal["female", "male", "intersex", "not_recorded"] = "not_recorded"
    phone: str = Field(default="", max_length=40, pattern=r"^(\+[0-9]{7,15})?$")
    relationship: Literal["self", "guardian"] = "self"
    contact_name: str = Field(default="", max_length=160)


@transaction.atomic
def submit(request, entry, values):
    proof = (
        RegistrationContact.objects.select_for_update()
        .filter(
            id=request.session.get("patient_registration_proof"),
            entry=entry,
            session_hash=session_hash(request),
            invalidated=False,
            verified_at__isnull=False,
            verified_until__gt=timezone.now(),
        )
        .first()
    )
    if not proof:
        raise DomainError("VERIFICATION_REQUIRED", "Verify your email before registering.", 403)
    previous = PatientApplication.objects.filter(contact=proof).first()
    if previous:
        request.session["patient_application"] = str(previous.id)
        return application_status(request, entry)
    try:
        parsed = ApplicationInput.model_validate(values)
    except ValidationError:
        raise DomainError(
            "INVALID_INPUT", "Check the patient name, birth date, relationship and phone number."
        ) from None
    today = datetime.now(ZoneInfo(entry.branch.organization.timezone)).date()
    if parsed.date_of_birth and parsed.date_of_birth > today:
        raise DomainError("INVALID_INPUT", "Date of birth cannot be in the future.")
    if parsed.relationship == "guardian" and not parsed.contact_name:
        raise DomainError("INVALID_INPUT", "Enter your name as the patient’s guardian.")
    email = proof.email
    if proof.channel == "mobile":
        try:
            email = validate_email(parsed.email, check_deliverability=False).normalized.lower()
        except EmailNotValidError:
            raise DomainError(
                "INVALID_INPUT", "Enter a valid email for your portal invitation."
            ) from None
        if len(email) > 254:
            raise DomainError("INVALID_INPUT", "Enter an email of at most 254 characters.")
    advisory_lock(f"patient-application:{entry.id}:{proof.phone or email}")
    matching_contact = (
        {"contact__phone": proof.phone, "contact__channel": "mobile"}
        if proof.channel == "mobile"
        else {"contact__email": email}
    )
    existing = PatientApplication.objects.filter(
        contact__entry=entry,
        **matching_contact,
        state="pending",
        full_name__iexact=parsed.full_name,
        date_of_birth=parsed.date_of_birth,
        relationship=parsed.relationship,
    ).first()
    application = existing or PatientApplication.objects.create(
        contact=proof, portal_email=email, **parsed.model_dump(exclude={"email"})
    )
    request.session["patient_application"] = str(application.id)
    audit(None, "portal.registration.submitted", entry.branch.organization_id, application.id)
    return {"state": application.state, "reference": str(application.id)[:8].upper()}


def staff_branch(request, values):
    user = require_session_realm(request, "staff")
    org = UUID(str(values["organization_id"]))
    member = require_membership(user, org, "portal.manage")
    require_membership(user, org, "patients.demographics.read")
    branch = (
        Branch.objects.select_related("organization")
        .filter(id=values["branch_id"], organization_id=org)
        .first()
    )
    if not branch or (member.branch_id and member.branch_id != branch.id):
        raise DomainError("FORBIDDEN", "Choose an authorized clinic branch.", 403)
    return user, branch


def duplicate_query(application, org):
    name = Q(full_name__iexact=application.full_name)
    if application.date_of_birth:
        name &= Q(date_of_birth=application.date_of_birth)
    match = name
    if application.relationship == "self":
        match |= Q(email__iexact=application.email_for_portal)
        if application.phone:
            match |= Q(phone=application.phone)
    return Patient.objects.filter(organization_id=org).filter(match)


def request_row(user, application, org):
    matches = duplicate_query(application, org)
    allowed = scoped_patients(user, org).filter(id__in=matches.values("id"))[:10]
    return {
        "id": str(application.id),
        "version": application.version,
        "full_name": application.full_name,
        "date_of_birth": str(application.date_of_birth) if application.date_of_birth else "",
        "sex": application.sex,
        "email": application.email_for_portal,
        "phone": application.phone,
        "email_verified": application.contact.channel != "mobile",
        "verified_mobile": application.contact.phone
        if application.contact.channel == "mobile"
        else "",
        "relationship": application.relationship,
        "contact_name": application.contact_name,
        "created_at": application.created_at.isoformat(),
        "possible_duplicate": matches.exists(),
        "matches": [
            {"id": str(patient.id), "name": patient.full_name, "reference": patient.reference}
            for patient in allowed
        ],
    }


def link_summary(entry):
    return (
        {
            "enabled": entry.enabled,
            "url": f"{get_settings().web_origin}/portal/register/{entry.token}",
        }
        if entry
        else None
    )


@transaction.atomic
def manage(request, values):
    user, branch = staff_branch(request, values)
    org = branch.organization_id
    action = values.get("action", "list")
    if action in {"create_link", "set_link"}:
        advisory_lock(f"patient-registration-entry:{branch.id}")
        entry = RegistrationEntry.objects.select_for_update().filter(branch=branch).first()
        if action == "create_link" and entry is None:
            entry = RegistrationEntry.objects.create(
                branch=branch, token=secrets.token_urlsafe(32), created_by=user
            )
        elif action == "set_link" and entry:
            if not isinstance(values.get("enabled"), bool):
                raise DomainError("INVALID_INPUT", "Choose whether registration is enabled.")
            entry.enabled = values["enabled"]
            entry.save(update_fields=["enabled"])
        elif entry is None:
            raise DomainError("NOT_FOUND", "Create the registration link first.", 404)
        audit(user, "portal.registration.link", org, entry.id)
        return {"link": link_summary(entry)}
    if action == "review":
        application = (
            PatientApplication.objects.select_for_update(of=("self",))
            .select_related("contact__entry")
            .filter(
                id=values["application_id"],
                contact__entry__branch=branch,
            )
            .first()
        )
        if not application:
            raise DomainError("NOT_FOUND", "This registration request is unavailable.", 404)
        decision = values.get("decision")
        if decision not in {"accept", "decline"}:
            raise DomainError("INVALID_INPUT", "Choose Accept or Decline.")
        if application.state != "pending":
            if application.state == ("accepted" if decision == "accept" else "declined"):
                return {"state": application.state}
            raise DomainError(
                "CONFLICT", "This request has already been reviewed. Refresh the list.", 409
            )
        check_version(application.version, int(values["expected_version"]))
        if decision == "accept":
            if values.get("identity_verified") is not True:
                raise DomainError(
                    "IDENTITY_REQUIRED",
                    "Confirm the patient’s identity and relationship before accepting.",
                )
            advisory_lock(f"patient-application-accept:{org}")
            if values.get("patient_id"):
                patient = require_patient(
                    user,
                    org,
                    UUID(str(values["patient_id"])),
                    "patients.demographics.read",
                    lock=True,
                )
                if not duplicate_query(application, org).filter(id=patient.id).exists():
                    raise DomainError(
                        "INVALID_INPUT", "Choose a matching patient after checking their identity."
                    )
            else:
                if duplicate_query(application, org).exists():
                    raise DomainError(
                        "MATCH_REVIEW",
                        "A possible existing record needs review. Link the verified matching patient or ask authorized clinic staff for help.",
                        409,
                    )
                patient = register_patient(
                    user,
                    org,
                    RegisterPatientInput(
                        full_name=application.full_name,
                        date_of_birth=application.date_of_birth,
                        sex=application.sex,
                        phone=application.phone or None,
                        email=application.email_for_portal
                        if application.relationship == "self"
                        else None,
                        branch_id=branch.id,
                        request_id=application.id,
                    ),
                )
            invitation = issue_invitation(
                user,
                org,
                patient.id,
                {
                    "email": application.email_for_portal,
                    "relationship": application.relationship,
                    "method": "verified_guardian_authority"
                    if application.relationship == "guardian"
                    else "clinic_verified_existing_identity",
                    "attested": True,
                    "note": "Clinic-reviewed patient self-registration.",
                },
                uuid4(),
            )
            application.patient = patient
            application.invitation = invitation
            application.state = "accepted"
        else:
            application.state = "declined"
        application.reviewed_by, application.reviewed_at = user, timezone.now()
        application.version += 1
        application.save()
        audit(user, "portal.registration." + application.state, org, application.id)
        return {"state": application.state}
    if action != "list":
        raise DomainError("INVALID_INPUT", "Choose an available registration action.")
    page = max(0, min(int(values.get("page", 0)), 10000))
    rows = (
        PatientApplication.objects.select_related("contact")
        .filter(contact__entry__branch=branch, state="pending")
        .order_by("created_at", "id")
    )
    count = rows.count()
    return {
        "link": link_summary(RegistrationEntry.objects.filter(branch=branch).first()),
        "pending_count": count,
        "has_more": count > (page + 1) * 20,
        "requests": [request_row(user, row, org) for row in rows[page * 20 : (page + 1) * 20]],
    }
