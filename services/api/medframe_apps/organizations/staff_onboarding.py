"""Recipient email proof and native MFA precede every staff membership activation."""

import hmac
import secrets
from datetime import timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from config.crypto import digest
from config.errors import DomainError
from medframe_apps.accounts import services as accounts
from medframe_apps.accounts.models import MfaCredential, User
from medframe_apps.auditing.services import audit
from medframe_apps.common import advisory_lock
from medframe_apps.providers.models import ProviderProfile
from .models import Membership, Role, StaffInvitation, StaffProfile
from .policy import permissions_for
from .staff_service import (
    invitation_permissions,
    invite_state,
    profile_values,
    queue_mail,
    settings_input,
)


def live_invitation(row, *, lock=False):
    if (
        not row
        or invite_state(row) != "pending"
        or not row.organization.active
        or not row.issued_by.is_active
    ):
        raise DomainError(
            "INVALID_INVITATION",
            "This invitation has expired, been revoked or already been accepted. Ask your clinic for a new link.",
            403,
        )
    issuer_query = Membership.objects.filter(
        user=row.issued_by, user__is_active=True, organization=row.organization, active=True
    )
    issuer = (issuer_query.select_for_update() if lock else issuer_query).first()
    if (
        not issuer
        or "organization.manage" not in permissions_for(issuer)
        or (issuer.branch_id and issuer.branch_id != row.branch_id)
        or StaffProfile.objects.filter(membership=issuer, workspace_mode="station").exists()
    ):
        raise DomainError("INVALID_INVITATION", "The clinic must issue a new invitation.", 403)
    return issuer


def invitation(request, token, *, proof=False, lock=False):
    if not isinstance(token, str) or not 40 <= len(token) <= 64:
        raise DomainError(
            "INVALID_INVITATION", "Use the complete invitation link from your clinic.", 403
        )
    query = StaffInvitation.objects.select_related("organization", "branch", "issued_by").filter(
        token_hash=digest(token)
    )
    row = (query.select_for_update(of=("self",)) if lock else query).first()
    live_invitation(row)
    if proof:
        require_proof(request, row)
    return row


def require_proof(request, row):
    nonce = request.session.get("staff_proof", "")
    if (
        request.session.get("staff_invitation") != str(row.id)
        or not nonce
        or not row.verified_at
        or row.verified_at <= timezone.now() - timedelta(minutes=30)
        or not hmac.compare_digest(row.proof_hash, digest(nonce))
    ):
        raise DomainError(
            "VERIFICATION_REQUIRED", "Verify your invited email again to continue.", 403
        )


def snapshot(request, row):
    try:
        require_proof(request, row)
        verified = True
    except DomainError:
        verified = False
    local, domain = row.email.split("@", 1)
    result = {
        "clinic": row.organization.name,
        "branch": row.branch.name if row.branch_id else "All permitted branches",
        "email_hint": local[:1] + "•••@" + domain,
        "verified": verified,
        "expires_at": row.expires_at.isoformat(),
        "roles": row.roles,
        "settings": row.settings,
        "organization_id": str(row.organization_id),
        "permissions": invitation_permissions(row),
    }
    if verified:
        result.update(
            email=row.email,
            progress=row.progress,
            photo_id=str(row.photo_id) if row.photo_id else None,
            has_account=User.objects.filter(email__iexact=row.email).exists(),
            signed_in=bool(
                request.user.is_authenticated
                and request.session.get("mfa_verified")
                and request.user.email.casefold() == row.email.casefold()
                and request.session.get("auth_realm", "staff") == "staff"
                and not getattr(request, "station_access", None)
                and not getattr(request, "station_doctor", None)
            ),
        )
    return result


@transaction.atomic
def request_code(request, token, email):
    row = invitation(request, token, lock=True)
    if not isinstance(email, str) or email.strip().casefold() != row.email.casefold():
        raise DomainError("EMAIL_MISMATCH", "Enter the email address your clinic invited.")
    nonce, code = secrets.token_urlsafe(32), f"{secrets.randbelow(1000000):06d}"
    row.proof_hash, row.otp_hash = digest(nonce), digest(f"{row.id}:{nonce}:{code}")
    row.otp_expires_at = timezone.now() + timedelta(minutes=10)
    row.attempts, row.verified_at = 0, None
    row.save(update_fields=["proof_hash", "otp_hash", "otp_expires_at", "attempts", "verified_at"])
    request.session["staff_proof"], request.session["staff_invitation"] = nonce, str(row.id)
    queue_mail(row, "staff_email_code", code=code, proof_hash=row.proof_hash)
    return {"sent": True}


def verify_email(request, token, code):
    valid = False
    with transaction.atomic():
        row = invitation(request, token, lock=True)
        nonce = request.session.get("staff_proof", "")
        if (
            not nonce
            or request.session.get("staff_invitation") != str(row.id)
            or not hmac.compare_digest(row.proof_hash, digest(nonce))
            or not row.otp_expires_at
            or row.otp_expires_at <= timezone.now()
            or row.attempts >= 5
        ):
            raise DomainError("CODE_EXPIRED", "Request a new email code.", 403)
        row.attempts += 1
        valid = (
            isinstance(code, str)
            and len(code) == 6
            and hmac.compare_digest(row.otp_hash, digest(f"{row.id}:{nonce}:{code}"))
        )
        if valid:
            row.verified_at, row.otp_hash = timezone.now(), ""
        row.save(update_fields=["attempts", "verified_at", "otp_hash"])
    if not valid:
        raise DomainError(
            "INVALID_CODE", "That code is invalid. Check all six digits and try again.", 403
        )
    return snapshot(request, row)


@transaction.atomic
def save_profile(request, token, data):
    row = invitation(request, token, proof=True, lock=True)
    row.progress = profile_values(data)
    if data.get("remove_photo") is True:
        row.photo = None
    row.save(update_fields=["progress", "photo"])
    return snapshot(request, row)


@transaction.atomic
def begin_account(request, token, data):
    row = invitation(request, token, proof=True, lock=True)
    if not row.progress.get("display_name"):
        raise DomainError("INVALID_INPUT", "Save your staff profile first.")
    if request.user.is_authenticated and (
        request.user.email.casefold() != row.email.casefold()
        or request.session.get("auth_realm", "staff") != "staff"
        or getattr(request, "station_access", None)
        or getattr(request, "station_doctor", None)
    ):
        raise DomainError(
            "IDENTITY_CONFLICT",
            "Use a separate browser profile or explicitly sign out before joining as another account.",
            409,
        )
    existing = User.objects.select_for_update().filter(email__iexact=row.email).first()
    password = data.get("password")
    if not isinstance(password, str) or not 1 <= len(password) <= 128:
        raise DomainError("INVALID_INPUT", "Enter your account password.")
    if existing:
        user = authenticate(request, username=existing.email, password=password)
        if not user or not user.is_active:
            raise DomainError("INVALID_CREDENTIALS", "Check your existing account password.", 401)
    else:
        if password != data.get("confirm") or len(password) < 15:
            raise DomainError("INVALID_INPUT", "Use matching passwords of 15–128 characters.")
        try:
            validate_password(
                password, User(email=row.email, display_name=row.progress["display_name"])
            )
        except ValidationError:
            raise DomainError(
                "INVALID_INPUT", "Choose a longer, less common password unrelated to your identity."
            ) from None
        user = User.objects.create_user(
            row.email, password, display_name=row.progress["display_name"]
        )
    nonce = request.session["staff_proof"]
    accounts.start_challenge(request, user, "staff")
    request.session["staff_proof"], request.session["staff_invitation"] = nonce, str(row.id)
    request.session["staff_token_hash"] = row.token_hash
    return {
        "next_step": "verify"
        if MfaCredential.objects.filter(user=user, confirmed=True).exists()
        else "enroll"
    }


def activate(request, row, user):
    issuer = live_invitation(row, lock=True)
    advisory_lock(f"staff-invite:{row.organization_id}:{row.email}")
    require_proof(request, row)
    if user.email.casefold() != row.email.casefold() or not user.is_active:
        raise DomainError("FORBIDDEN", "Sign in using the invited account.", 403)
    if Membership.objects.filter(organization=row.organization, user=user).exists():
        raise DomainError(
            "EXISTING_STAFF",
            "Your clinic membership already exists. Ask the administrator to manage it.",
            409,
        )
    roles, branch, settings = settings_input(
        issuer,
        {
            **row.settings,
            "roles": row.roles,
            "branch_id": str(row.branch_id) if row.branch_id else None,
        },
    )
    values = profile_values(row.progress)
    member = Membership.objects.create(user=user, organization=row.organization, branch=branch)
    member.roles.set(Role.objects.filter(name__in=roles))
    StaffProfile.objects.create(
        membership=member,
        **values,
        workspace_mode=settings["workspace_mode"],
        billing_access=settings["billing_access"],
        photo=row.photo,
    )
    if row.photo_id:
        row.photo.membership = member
        row.photo.save(update_fields=["membership"])
    if set(roles) & {"doctor", "dentist"}:
        ProviderProfile.objects.create(
            membership=member,
            specialty=settings["specialty"],
            professional_title=settings["professional_title"],
        )
    row.user, row.accepted_at = user, timezone.now()
    row.save(update_fields=["user", "accepted_at"])
    audit(user, "staff.invitation.accepted", row.organization_id, member.id)
    return {
        "organization_id": str(row.organization_id),
        "workspace_mode": settings["workspace_mode"],
    }


class StaffActivation:
    def prepare(self, user, request):
        self.row = (
            StaffInvitation.objects.select_for_update()
            .select_related("organization", "branch", "issued_by")
            .filter(
                id=request.session.get("staff_invitation"),
                token_hash=request.session.get("staff_token_hash", ""),
            )
            .first()
        )
        live_invitation(self.row)
        require_proof(request, self.row)
        self.result = None

    def complete(self, user, request):
        self.result = activate(request, self.row, user)


@transaction.atomic
def begin_google(request, token, credential):
    """An existing account must already own this Google subject; email matching is insufficient."""
    from medframe_apps.accounts.models import GoogleIdentity
    from medframe_apps.portal.registration_google import claims_for

    row = invitation(request, token, proof=True, lock=True)
    if not row.progress.get("display_name"):
        raise DomainError("INVALID_INPUT", "Save your staff profile first.")
    if request.user.is_authenticated and (
        request.user.email.casefold() != row.email.casefold()
        or request.session.get("auth_realm", "staff") != "staff"
        or getattr(request, "station_access", None)
        or getattr(request, "station_doctor", None)
    ):
        raise DomainError(
            "IDENTITY_CONFLICT",
            "Use a separate browser profile or explicitly sign out before joining as another account.",
            409,
        )
    email, subject, _, _ = claims_for(request, credential, f"staff:{row.id}")
    if email.casefold() != row.email.casefold():
        raise DomainError("EMAIL_MISMATCH", "Choose the Google account your clinic invited.", 403)
    existing = User.objects.select_for_update().filter(email__iexact=row.email).first()
    identity = GoogleIdentity.objects.select_related("user").filter(subject=subject).first()
    if existing:
        if not existing.is_active or not identity or identity.user_id != existing.id:
            raise DomainError(
                "GOOGLE_ACCOUNT_UNAVAILABLE",
                "Use your existing Medframe password and authenticator. Google is not linked to this account.",
                401,
            )
        user = existing
    else:
        if identity:
            raise DomainError(
                "GOOGLE_ACCOUNT_UNAVAILABLE",
                "Use the account already linked to this Google identity.",
                401,
            )
        user = User(email=row.email, display_name=row.progress["display_name"])
        user.set_unusable_password()
        user.save()
        GoogleIdentity.objects.create(user=user, subject=subject)
    nonce = request.session["staff_proof"]
    accounts.start_challenge(request, user, "staff")
    request.session["staff_proof"], request.session["staff_invitation"] = nonce, str(row.id)
    request.session["staff_token_hash"] = row.token_hash
    request.session["challenge_google"] = {"subject": subject, "email": user.email}
    return {
        "next_step": "verify"
        if MfaCredential.objects.filter(user=user, confirmed=True).exists()
        else "enroll"
    }
