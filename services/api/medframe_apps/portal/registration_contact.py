"""Contact ownership proof for intake; never an authenticated patient session."""

import hashlib
import hmac
import json
import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from email_validator import EmailNotValidError, validate_email

from config.crypto import cipher, digest
from config.errors import DomainError
from medframe_apps.accounts.models import MailOutbox
from medframe_apps.accounts.throttling import throttle
from medframe_apps.common import advisory_lock
from medframe_apps.portal.registration_models import (
    PatientApplication,
    RegistrationContact,
    RegistrationEntry,
)

from . import smsgate


def live_entry(token):
    entry = (
        RegistrationEntry.objects.select_related("branch__organization")
        .filter(token=token, enabled=True, branch__organization__active=True)
        .first()
    )
    if not entry:
        raise DomainError(
            "NOT_FOUND", "This registration link is unavailable. Contact your clinic.", 404
        )
    return entry


def session_hash(request):
    if not request.session.session_key:
        request.session.create()
    return digest(request.session.session_key)


def code_hash(identifier, code):
    return hmac.new(
        settings.SECRET_KEY.encode(),
        f"patient-registration:{identifier}:{code}".encode(),
        hashlib.sha256,
    ).hexdigest()


def application_status(request, entry):
    identifier = request.session.get("patient_application")
    application = (
        PatientApplication.objects.select_related("contact")
        .filter(id=identifier, contact__entry=entry)
        .first()
        if identifier
        else None
    )
    if application and application.contact.session_hash != session_hash(request):
        proof = RegistrationContact.objects.filter(
            id=request.session.get("patient_registration_proof"),
            entry=entry,
            **(
                {"phone": application.contact.phone, "channel": "mobile"}
                if application.contact.channel == "mobile"
                else {"email": application.contact.email}
            ),
            session_hash=session_hash(request),
            invalidated=False,
            verified_at__isnull=False,
            verified_until__gt=timezone.now(),
        ).first()
        if not proof:
            application = None
    return (
        {"state": application.state, "reference": str(application.id)[:8].upper()}
        if application
        else None
    )


def bootstrap(request, entry):
    proof = RegistrationContact.objects.filter(
        id=request.session.get("patient_registration_proof"),
        entry=entry,
        session_hash=session_hash(request),
        invalidated=False,
        verified_at__isnull=False,
        verified_until__gt=timezone.now(),
    ).first()
    return {
        "clinic": entry.branch.organization.name,
        "branch": entry.branch.name,
        "email_verified": bool(proof and proof.channel != "mobile"),
        "contact_verified": bool(proof),
        "channel": proof.channel if proof else "email",
        "phone": proof.phone if proof else "",
        "email": proof.email if proof else "",
        "application": application_status(request, entry),
        "mobile_available": smsgate.configured(),
    }


@transaction.atomic
def send_code(request, entry, value, channel="email"):
    if channel not in {"email", "mobile"}:
        raise DomainError("INVALID_INPUT", "Choose email or mobile verification.")
    value = value.strip() if isinstance(value, str) else ""
    email, phone = "", ""
    if channel == "mobile":
        if not smsgate.configured():
            raise DomainError(
                "SMS_UNAVAILABLE",
                "Mobile verification is not configured. Use email or Google.",
                503,
            )
        phone = re.sub(r"[\s()-]", "", value)
        if not re.fullmatch(r"\+639[0-9]{9}", phone):
            raise DomainError(
                "INVALID_INPUT",
                "Enter a Philippine mobile number beginning +63 and followed by 10 digits.",
            )
    else:
        email = value.lower()
        try:
            if len(email) > 254:
                raise EmailNotValidError("Too long")
            email = validate_email(email, check_deliverability=False).normalized.lower()
        except EmailNotValidError:
            raise DomainError("INVALID_INPUT", "Enter a valid email address.") from None
    identity = digest(email or phone)
    throttle(request, "patient-register-send", identity, 1, 60)
    throttle(request, "patient-register-hour", identity, 5, 3600)
    bound = session_hash(request)
    advisory_lock(f"patient-registration-code:{entry.id}:{bound}")
    RegistrationContact.objects.filter(entry=entry, session_hash=bound).update(invalidated=True)
    code = f"{secrets.randbelow(1000000):06d}"
    proof = RegistrationContact.objects.create(
        entry=entry,
        email=email,
        phone=phone,
        channel=channel,
        session_hash=bound,
        code_hash="",
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    proof.code_hash = code_hash(proof.id, code)
    proof.save(update_fields=["code_hash"])
    request.session["patient_registration_challenge"] = str(proof.id)
    request.session.pop("patient_registration_proof", None)
    MailOutbox.objects.create(
        kind="patient_register_sms" if channel == "mobile" else "patient_register_code",
        encrypted_payload=cipher()
        .encrypt(
            json.dumps(
                {
                    "recipient": phone or email,
                    "code": code,
                    "challenge": str(proof.id),
                }
            ).encode()
        )
        .decode(),
        available_at=timezone.now(),
    )
    return {
        "message": "Your verification code is queued for delivery.",
        "expires_in": 600,
        "resend_after": 60,
    }


def verify_code(request, entry, code):
    error = None
    with transaction.atomic():
        proof = (
            RegistrationContact.objects.select_for_update()
            .filter(
                id=request.session.get("patient_registration_challenge"),
                entry=entry,
                session_hash=session_hash(request),
            )
            .first()
        )
        now = timezone.now()
        if (
            not proof
            or proof.invalidated
            or proof.verified_at
            or proof.expires_at <= now
            or proof.attempts >= 5
        ):
            raise DomainError(
                "INVALID_CODE", "This code has expired or is unavailable. Request a new code.", 403
            )
        proof.attempts += 1
        if not isinstance(code, str) or not hmac.compare_digest(
            proof.code_hash, code_hash(proof.id, code)
        ):
            proof.save(update_fields=["attempts"])
            error = DomainError(
                "INVALID_CODE", "That code did not match. Check the six digits and try again.", 403
            )
        else:
            proof.verified_at = now
            proof.verified_until = now + timedelta(minutes=30)
            proof.code_hash = ""
            proof.save(update_fields=["attempts", "verified_at", "verified_until", "code_hash"])
            request.session["patient_registration_proof"] = str(proof.id)
            request.session.pop("patient_registration_challenge", None)
    if error:
        raise error
    return bootstrap(request, entry)
