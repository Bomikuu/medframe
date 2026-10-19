import json
import secrets
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone

from config.crypto import cipher, digest
from config.errors import DomainError
from config.runtime import get_settings
from medframe_apps.accounts.models import MailOutbox
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version

from .models import ClinicInvitation, OnboardingVerification
from .policy import invitation_state, require_platform_admin


def queue_mail(invitation, kind, **values):
    payload = {
        "recipient": invitation.email,
        "invitation": str(invitation.id),
        "generation": invitation.generation,
        **values,
    }
    MailOutbox.objects.create(
        kind=kind,
        encrypted_payload=cipher().encrypt(json.dumps(payload).encode()).decode(),
        available_at=timezone.now(),
    )


def deliver_link(invitation, token):
    queue_mail(
        invitation,
        "clinic_invitation",
        link=f"{get_settings().web_origin}/onboarding/invite/{token}",
    )


def serialize(invitation):
    return {
        "id": str(invitation.id),
        "email": invitation.email,
        "contact_name": invitation.contact_name,
        "clinic_name": invitation.clinic_name,
        "status": invitation_state(invitation),
        "created_at": invitation.created_at.isoformat(),
        "expires_at": invitation.expires_at.isoformat(),
        "version": invitation.version,
    }


@transaction.atomic
def issue_invitation(request, data, request_id):
    user = require_platform_admin(request)
    if not isinstance(data, dict) or set(data) - {"email", "contact_name", "clinic_name", "hours"}:
        raise DomainError("INVALID_INPUT", "Check invitation fields.")
    email = str(data.get("email", "")).strip().lower()
    hours = data.get("hours", 168)
    try:
        validate_email(email)
        if len(email) > 320 or type(hours) is not int or not 1 <= hours <= 720:
            raise ValueError()
        if any(
            not isinstance(data.get(key, ""), str) or len(data.get(key, "")) > 160
            for key in ["contact_name", "clinic_name"]
        ):
            raise ValueError()
    except (ValidationError, ValueError):
        raise DomainError(
            "INVALID_INPUT", "Use a valid email and an expiration from 1 to 720 hours."
        ) from None
    previous = ClinicInvitation.objects.filter(request_id=request_id).first()
    if previous:
        if previous.issued_by_id != user.id or previous.email != email:
            raise DomainError("CONFLICT", "This request was already used.", 409)
        return serialize(previous)
    token = secrets.token_urlsafe(32)
    invitation = ClinicInvitation.objects.create(
        email=email,
        contact_name=data.get("contact_name", "").strip(),
        clinic_name=data.get("clinic_name", "").strip(),
        token_hash=digest(token),
        request_id=request_id,
        issued_by=user,
        expires_at=timezone.now() + timedelta(hours=hours),
    )
    deliver_link(invitation, token)
    audit(user, "onboarding.invited", resource_id=invitation.id)
    return serialize(invitation)


@transaction.atomic
def manage_invitation(request, identifier, expected_version, action):
    user = require_platform_admin(request)
    invitation = ClinicInvitation.objects.select_for_update().filter(id=identifier).first()
    if not invitation or invitation.completed_at:
        raise DomainError(
            "CONFLICT", "A completed or unavailable invitation cannot be changed.", 409
        )
    check_version(invitation.version, expected_version)
    OnboardingVerification.objects.filter(invitation=invitation).update(invalidated=True)
    invitation.generation += 1
    invitation.version += 1
    if action == "revoke":
        invitation.revoked_at = timezone.now()
    elif action == "resend":
        token = secrets.token_urlsafe(32)
        invitation.token_hash = digest(token)
        invitation.revoked_at = None
        invitation.expires_at = timezone.now() + timedelta(days=7)
        deliver_link(invitation, token)
    else:
        raise DomainError("INVALID_INPUT", "Choose resend or revoke.")
    invitation.save()
    audit(user, f"onboarding.{action}", resource_id=invitation.id)
    return serialize(invitation)
