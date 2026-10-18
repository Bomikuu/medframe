import json
import secrets
from datetime import timedelta
from typing import Literal

from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from pydantic import Field, field_validator
from pydantic import ValidationError as InputError

from config.crypto import cipher, digest
from config.errors import DomainError
from config.runtime import get_settings
from medframe_apps.accounts.models import MailOutbox, MfaCredential, User
from medframe_apps.accounts.services import start_challenge
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.encounters.inputs import Input
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.models import Patient
from medframe_apps.patients.services import require_patient
from medframe_apps.portal.models import PortalAccessEvent, PortalInvitation, PortalLink
from medframe_apps.portal.policy import eligible_patient


class InvitationInput(Input):
    email: str = Field(min_length=3, max_length=320)
    relationship: Literal["self", "guardian"]
    method: Literal["in_person", "clinic_verified_existing_identity", "verified_guardian_authority"]
    note: str = Field(default="", max_length=240)
    attested: bool

    @field_validator("email")
    @classmethod
    def valid_email(cls, value):
        try:
            validate_email(value)
        except ValidationError:
            raise ValueError("Invalid email") from None
        return value.lower()


def manage_patient(user, org, patient_id):
    require_membership(user, org, "portal.manage")
    return require_patient(user, org, patient_id, "patients.demographics.read", lock=True)


@transaction.atomic
def issue_invitation(user, org, patient_id, data, request_id):
    patient = manage_patient(user, org, patient_id)
    try:
        parsed = InvitationInput.model_validate(data)
    except InputError:
        raise DomainError("INVALID_INPUT", "Complete the identity verification fields.") from None
    if not parsed.attested or (
        parsed.relationship == "guardian" and parsed.method != "verified_guardian_authority"
    ):
        raise DomainError(
            "INVALID_INPUT", "Verify identity and guardian authority before inviting."
        )
    values = {"patient": str(patient.id), **parsed.model_dump(mode="json")}
    previous = replay_request(user, org, "portal.invite", request_id, values)
    if previous:
        return PortalInvitation.objects.get(id=previous)
    email = str(parsed.email).lower()
    if (
        parsed.relationship == "self"
        and PortalLink.objects.filter(patient=patient, relationship="self", active=True).exists()
    ):
        raise DomainError("CONFLICT", "This patient already has an active self connection.", 409)
    pending = PortalInvitation.objects.select_for_update().filter(
        patient=patient,
        relationship=parsed.relationship,
        consumed_at__isnull=True,
        revoked_at__isnull=True,
    )
    if parsed.relationship == "guardian":
        pending = pending.filter(email=email)
    for old in pending:
        old.revoked_at = timezone.now()
        old.save(update_fields=["revoked_at"])
        PortalAccessEvent.objects.create(
            organization_id=org, invitation=old, actor=user, action="reissued"
        )
    token = secrets.token_urlsafe(32)
    invitation = PortalInvitation.objects.create(
        organization_id=org,
        patient=patient,
        issued_by=user,
        email=email,
        relationship=parsed.relationship,
        method=parsed.method,
        note=parsed.note,
        token_hash=digest(token),
        expires_at=timezone.now() + timedelta(hours=24),
    )
    payload = {
        "recipient": email,
        "link": f"{get_settings().web_origin}/portal/invite#token={token}",
    }
    MailOutbox.objects.create(
        kind="portal_invitation",
        encrypted_payload=cipher().encrypt(json.dumps(payload).encode()).decode(),
        available_at=timezone.now(),
    )
    PortalAccessEvent.objects.create(
        organization_id=org, invitation=invitation, actor=user, action="issued"
    )
    record_request_result(user, org, "portal.invite", request_id, values, invitation.id)
    return invitation


def valid_invitation(invitation):
    if (
        invitation is None
        or invitation.revoked_at
        or invitation.consumed_at
        or invitation.expires_at <= timezone.now()
        or not invitation.organization.active
    ):
        raise DomainError(
            "INVALID_INVITATION",
            "This invitation is unavailable or expired. Contact your clinic.",
            403,
        )


@transaction.atomic
def prepare_invitation(request, token, password, display_name=""):
    if (
        not isinstance(token, str)
        or not 20 <= len(token) <= 128
        or not isinstance(password, str)
        or len(password) > 128
        or not isinstance(display_name, str)
        or len(display_name) > 160
    ):
        raise DomainError("INVALID_INPUT", "Check the invitation and account details.")
    pending = (
        PortalInvitation.objects.select_related("organization")
        .filter(token_hash=digest(token))
        .first()
    )
    valid_invitation(pending)
    advisory_lock(f"portal-identity:{pending.email}")
    user = User.objects.select_for_update().filter(email=pending.email).first()
    if user:
        # Invitation preparation must not invoke the automatic password-upgrade setter.
        # Django still verifies the hash; existing credentials remain intact through MFA.
        if not user.is_active or not check_password(password, user.password):
            raise DomainError(
                "INVALID_CREDENTIALS", "Use the existing account password for this invitation.", 401
            )
    else:
        user = User(email=pending.email, display_name=display_name.strip())
        try:
            validate_password(password, user)
        except ValidationError:
            raise DomainError(
                "INVALID_PASSWORD",
                "Use 15–128 characters and an uncommon password unrelated to your account.",
            ) from None
        user.set_password(password)
        user.save()
    Patient.objects.select_for_update().get(id=pending.patient_id)
    invitation = (
        PortalInvitation.objects.select_for_update()
        .select_related("organization")
        .get(id=pending.id)
    )
    valid_invitation(invitation)
    start_challenge(request, user, "patient")
    request.session["portal_invitation"] = str(invitation.id)
    invitation.pending_user = user
    invitation.pending_epoch = user.auth_epoch
    invitation.pending_session_hash = digest(request.session.session_key)
    invitation.save(update_fields=["pending_user", "pending_epoch", "pending_session_hash"])
    return (
        "verify" if MfaCredential.objects.filter(user=user, confirmed=True).exists() else "enroll"
    )


class PortalActivation:
    def prepare(self, user, request):
        identifier = request.session.get("portal_invitation")
        self.invitation = None
        if not identifier:
            if not eligible_patient(user):
                raise DomainError("FORBIDDEN", "No active patient connection is available.", 403)
            return
        pending = PortalInvitation.objects.filter(id=identifier).first()
        if pending is None:
            raise DomainError(
                "INVALID_INVITATION", "Contact your clinic for another invitation.", 403
            )
        Patient.objects.select_for_update().get(id=pending.patient_id)
        invitation = (
            PortalInvitation.objects.select_for_update()
            .select_related("organization")
            .get(id=identifier)
        )
        valid_invitation(invitation)
        if (
            invitation.pending_user_id != user.id
            or invitation.email != user.email
            or invitation.pending_epoch != user.auth_epoch
            or invitation.pending_session_hash != digest(request.session.session_key)
        ):
            raise DomainError("INVALID_INVITATION", "Restart sign-in from the invitation.", 403)
        if (
            PortalLink.objects.filter(patient_id=invitation.patient_id, active=True)
            .filter(
                relationship="self" if invitation.relationship == "self" else "guardian",
                **({} if invitation.relationship == "self" else {"user": user}),
            )
            .exists()
        ):
            raise DomainError("CONFLICT", "This connection is already active. Sign in again.", 409)
        self.invitation = invitation

    def complete(self, user, request):
        if self.invitation is None:
            # Lock existing links while session establishment is committed.
            if (
                not PortalLink.objects.select_for_update()
                .filter(user=user, active=True, organization__active=True)
                .exists()
            ):
                raise DomainError("FORBIDDEN", "No active patient connection is available.", 403)
            return
        invitation = self.invitation
        link = PortalLink.objects.create(
            organization_id=invitation.organization_id,
            patient_id=invitation.patient_id,
            user=user,
            invitation=invitation,
            relationship=invitation.relationship,
        )
        invitation.consumed_at = timezone.now()
        invitation.pending_session_hash = ""
        invitation.save(update_fields=["consumed_at", "pending_session_hash"])
        PortalAccessEvent.objects.create(
            organization_id=link.organization_id,
            invitation=invitation,
            link=link,
            actor=user,
            action="claimed",
        )


@transaction.atomic
def revoke_access(user, org, identifier, *, kind, expected_version=1, reason=""):
    if not isinstance(reason, str) or not 1 <= len(reason.strip()) <= 240:
        raise DomainError("INVALID_INPUT", "Give a short reason for revocation.")
    model = PortalLink if kind == "link" else PortalInvitation
    initial = model.objects.filter(id=identifier, organization_id=org).first()
    if initial is None:
        raise DomainError("NOT_FOUND", "Connection is unavailable.", 404)
    manage_patient(user, org, initial.patient_id)
    item = model.objects.select_for_update().get(id=identifier)
    if kind == "link":
        check_version(item.version, expected_version)
        item.active = False
        item.version += 1
        item.save(update_fields=["active", "version"])
    else:
        item.revoked_at = timezone.now()
        item.save(update_fields=["revoked_at"])
    PortalAccessEvent.objects.create(
        organization_id=org,
        actor=user,
        action="revoked",
        reason=reason.strip(),
        **{kind if kind == "link" else "invitation": item},
    )
    return item
