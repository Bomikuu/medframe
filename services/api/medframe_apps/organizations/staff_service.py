"""Native, versioned clinic staff administration. No credential or patient-grant writes."""

import json
import re
import secrets
from datetime import timedelta
from zoneinfo import ZoneInfo

from django.db.models import Exists, OuterRef

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone

from config.crypto import cipher, digest
from config.errors import DomainError
from config.runtime import get_settings
from medframe_apps.accounts.models import MailOutbox
from medframe_apps.auditing.services import audit
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.expansion_policy import require_native_staff
from medframe_apps.onboarding.models import MedicalSpecialty
from medframe_apps.providers.models import ProviderProfile
from .models import Branch, Membership, Role, StaffInvitation, StaffProfile
from .policy import permissions_for, require_membership
from .staff_policy import BILLING_LEVELS, STAFF_ROLES


def administrator(request, organization_id):
    require_native_staff(request)
    return require_membership(request.user, organization_id, "organization.manage")


def branch_scope(actor, branch_id):
    branch = (
        Branch.objects.filter(id=branch_id, organization_id=actor.organization_id).first()
        if branch_id
        else None
    )
    if (branch_id and not branch) or (
        actor.branch_id and (not branch or branch.id != actor.branch_id)
    ):
        raise DomainError("FORBIDDEN", "Choose a branch you manage.", 403)
    return branch


def choices():
    return list(MedicalSpecialty.objects.filter(active=True).values("code", "name"))


def role_permissions():
    return {
        role.name: sorted(permission.codename for permission in role.permissions.all())
        for role in Role.objects.filter(name__in=STAFF_ROLES).prefetch_related("permissions")
    }


def invitation_permissions(row):
    from .staff_policy import billing_permissions

    codes = set(
        Role.objects.filter(name__in=row.roles).values_list("permissions__codename", flat=True)
    ) - {None}
    return sorted(billing_permissions(codes, row.settings.get("billing_access", "inherit")))


def settings_input(actor, data, *, existing_specialty=None):
    roles = data.get("roles")
    if (
        not isinstance(roles, list)
        or not roles
        or len(set(roles)) != len(roles)
        or not set(roles) <= STAFF_ROLES
    ):
        raise DomainError("INVALID_INPUT", "Choose supported clinic staff roles.")
    if Role.objects.filter(name__in=roles).count() != len(roles):
        raise DomainError(
            "INVALID_INPUT",
            "A selected role is not configured. Contact the platform administrator.",
        )
    mode = data.get("workspace_mode", "full")
    billing = data.get("billing_access", "inherit")
    if mode not in {"full", "station"} or billing not in {"inherit", *BILLING_LEVELS}:
        raise DomainError("INVALID_INPUT", "Choose workspace and billing access.")
    branch = branch_scope(actor, data.get("branch_id"))
    if mode == "station" and not branch:
        raise DomainError("INVALID_INPUT", "Assign a branch for Station-only staff.")
    title = data.get("professional_title", "")
    specialty = data.get("specialty", "")
    if not isinstance(title, str) or len(title) > 120:
        raise DomainError("INVALID_INPUT", "Use a professional title up to 120 characters.")
    if set(roles) & {"doctor", "dentist"}:
        if (
            not isinstance(specialty, str)
            or not specialty
            or len(specialty) > 40
            or (
                specialty != existing_specialty
                and not MedicalSpecialty.objects.filter(code=specialty, active=True).exists()
            )
        ):
            raise DomainError("INVALID_INPUT", "Choose an available doctor specialty.")
    else:
        specialty = ""
    return (
        roles,
        branch,
        {
            "workspace_mode": mode,
            "billing_access": billing,
            "specialty": specialty,
            "professional_title": title.strip(),
        },
    )


def profile_values(data):
    name, phone = data.get("display_name", ""), data.get("phone", "")
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 160:
        raise DomainError("INVALID_INPUT", "Enter a display name up to 160 characters.")
    if not isinstance(phone, str) or (phone and not re.fullmatch(r"\+[1-9][0-9]{7,14}", phone)):
        raise DomainError(
            "INVALID_INPUT", "Use an international phone number, for example +639171234567."
        )
    return {"display_name": name.strip(), "phone": phone}


def queue_mail(invitation, kind, **payload):
    MailOutbox.objects.create(
        kind=kind,
        available_at=timezone.now(),
        encrypted_payload=cipher()
        .encrypt(
            json.dumps(
                {
                    "invitation": str(invitation.id),
                    "token_hash": invitation.token_hash,
                    "recipient": invitation.email,
                    **payload,
                }
            ).encode()
        )
        .decode(),
    )


def invite_state(invitation):
    if invitation.accepted_at:
        return "accepted"
    if invitation.revoked_at:
        return "revoked"
    return "expired" if invitation.expires_at <= timezone.now() else "pending"


def member_row(member):
    profile = getattr(member, "staffprofile", None)
    provider = getattr(member, "providerprofile", None)
    return {
        "id": str(member.id),
        "name": profile.display_name
        if profile and profile.display_name
        else member.user.display_name,
        "email": member.user.email,
        "active": member.active,
        "account_active": member.user.is_active,
        "branch_id": str(member.branch_id) if member.branch_id else None,
        "branch": member.branch.name if member.branch_id else "All permitted branches",
        "roles": [role.name for role in member.roles.all() if role.name in STAFF_ROLES],
        "permissions": sorted(permissions_for(member)),
        "version": profile.version if profile else 1,
        "phone": profile.phone if profile else "",
        "workspace_mode": profile.workspace_mode if profile else "full",
        "billing_access": profile.billing_access if profile else "inherit",
        "provider_readiness": {
            "profile": provider is not None,
            "specialty": bool(provider and provider.specialty),
            "scheduled": bool(getattr(member, "has_schedule", False)),
        },
        "specialty": provider.specialty if provider else "",
        "professional_title": provider.professional_title if provider else "",
        "photo_id": str(profile.photo_id) if profile and profile.photo_id else None,
    }


def snapshot(actor):
    from .setup_readiness import setup_readiness

    members = (
        Membership.objects.filter(organization=actor.organization)
        .select_related("user", "branch", "staffprofile", "providerprofile")
        .prefetch_related("roles__permissions")
        .order_by("user__display_name", "id")
    )
    invitations = (
        StaffInvitation.objects.filter(organization=actor.organization)
        .select_related("branch")
        .order_by("-created_at")
    )
    branches = Branch.objects.filter(organization=actor.organization)
    if actor.branch_id:
        members, invitations, branches = (
            members.filter(branch=actor.branch),
            invitations.filter(branch=actor.branch),
            branches.filter(id=actor.branch_id),
        )
    from medframe_apps.operations.models import ProviderSchedule

    today = timezone.now().astimezone(ZoneInfo(actor.organization.timezone)).date()
    windows = ProviderSchedule.objects.filter(
        provider__membership_id=OuterRef("pk"),
        branch__in=branches,
        active=True,
        effective_to__gte=today,
    )
    members = members.annotate(has_schedule=Exists(windows))
    return {
        "members": [member_row(member) for member in members[:200]],
        "limit": 200,
        "invitations": [
            {
                "id": str(row.id),
                "email": row.email,
                "state": invite_state(row),
                "version": row.version,
                "branch": row.branch.name if row.branch_id else "All permitted branches",
                "expires_at": row.expires_at.isoformat(),
                "roles": row.roles,
            }
            for row in invitations[:100]
        ],
        "branches": [{"id": str(row.id), "name": row.name} for row in branches],
        "specialties": choices(),
        "roles": sorted(STAFF_ROLES),
        "actor_id": str(actor.id),
        "branch_restricted": bool(actor.branch_id),
        "role_permissions": role_permissions(),
        "readiness": setup_readiness(),
    }


def require_target(actor, identifier, *, lock=False):
    query = Membership.objects.select_related("user", "branch").filter(
        id=identifier, organization=actor.organization
    )
    if actor.branch_id:
        query = query.filter(branch=actor.branch)
    member = (query.select_for_update(of=("self",)) if lock else query).first()
    if not member:
        raise DomainError("NOT_FOUND", "This staff member is unavailable.", 404)
    return member


@transaction.atomic
def update_member(request, actor, data):
    advisory_lock(f"staff-admin:{actor.organization_id}")
    member = require_target(actor, data["membership_id"], lock=True)
    profile, _ = StaffProfile.objects.get_or_create(membership=member)
    check_version(profile.version, data["version"])
    provider = ProviderProfile.objects.filter(membership=member).first()
    roles, branch, settings = settings_input(
        actor, data, existing_specialty=provider.specialty if provider else None
    )
    active = data.get("active")
    if type(active) is not bool:
        raise DomainError("INVALID_INPUT", "Choose whether this staff membership is active.")
    old_roles = set(member.roles.filter(name__in=STAFF_ROLES).values_list("name", flat=True))
    access_changed = (
        old_roles != set(roles)
        or member.branch_id != (branch.id if branch else None)
        or member.active != active
        or profile.workspace_mode != settings["workspace_mode"]
        or profile.billing_access != settings["billing_access"]
    )
    if member.id == actor.id and access_changed:
        raise DomainError(
            "SELF_ACCESS", "Another clinic administrator must change your own access.", 409
        )
    loses_admin = "organization.manage" in permissions_for(member) and (
        not active or "clinic_administrator" not in roles or settings["workspace_mode"] == "station"
    )
    if loses_admin:
        others = Membership.objects.filter(
            organization=actor.organization, active=True, user__is_active=True
        ).exclude(id=member.id)
        if not any(
            "organization.manage" in permissions_for(other)
            and not StaffProfile.objects.filter(membership=other, workspace_mode="station").exists()
            for other in others
        ):
            raise DomainError(
                "LAST_ADMIN",
                "Keep at least one active clinic administrator with full workspace access.",
                409,
            )
    values = profile_values(data)
    member.branch, member.active = branch, active
    member.save(update_fields=["branch", "active"])
    member.roles.set(
        Role.objects.filter(
            name__in=set(roles)
            | set(member.roles.exclude(name__in=STAFF_ROLES).values_list("name", flat=True))
        )
    )
    for key, value in {
        **values,
        "workspace_mode": settings["workspace_mode"],
        "billing_access": settings["billing_access"],
    }.items():
        setattr(profile, key, value)
    if data.get("remove_photo") is True:
        profile.photo = None
    profile.version += 1
    profile.save()
    if set(roles) & {"doctor", "dentist"}:
        ProviderProfile.objects.update_or_create(
            membership=member,
            defaults={
                "specialty": settings["specialty"],
                "professional_title": settings["professional_title"],
            },
        )
    audit(request.user, "staff.membership.updated", actor.organization_id, member.id)
    member.refresh_from_db()
    return member_row(member)


@transaction.atomic
def create_invitation(request, actor, data):
    email = str(data.get("email", "")).strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        raise DomainError("INVALID_INPUT", "Enter a valid staff email address.") from None
    if len(email) > 320:
        raise DomainError("INVALID_INPUT", "Email address is too long.")
    roles, branch, settings = settings_input(actor, data)
    advisory_lock(f"staff-invite:{actor.organization_id}:{email}")
    if Membership.objects.filter(
        organization=actor.organization, user__email__iexact=email
    ).exists():
        raise DomainError(
            "EXISTING_STAFF",
            "This account already belongs to the clinic. Manage the existing membership.",
            409,
        )
    if StaffInvitation.objects.filter(
        organization=actor.organization,
        email=email,
        revoked_at__isnull=True,
        accepted_at__isnull=True,
        expires_at__gt=timezone.now(),
    ).exists():
        raise DomainError(
            "PENDING_INVITE", "An invitation is already pending. Regenerate its link instead.", 409
        )
    token = secrets.token_urlsafe(32)
    invitation = StaffInvitation.objects.create(
        organization=actor.organization,
        branch=branch,
        email=email,
        issued_by=request.user,
        token_hash=digest(token),
        encrypted_token=cipher().encrypt(token.encode()).decode(),
        roles=roles,
        settings=settings,
        expires_at=timezone.now() + timedelta(days=3),
    )
    link = f"{get_settings().web_origin}/staff/onboarding/{token}"
    queue_mail(invitation, "staff_invitation", link=link)
    audit(request.user, "staff.invitation.created", actor.organization_id, invitation.id)
    return {"id": str(invitation.id), "link": link}


@transaction.atomic
def change_invitation(request, actor, data):
    query = StaffInvitation.objects.select_for_update().filter(
        id=data["invitation_id"], organization=actor.organization
    )
    if actor.branch_id:
        query = query.filter(branch=actor.branch)
    row = query.first()
    if not row or row.accepted_at:
        raise DomainError("NOT_FOUND", "This invitation cannot be changed.", 404)
    check_version(row.version, data["version"])
    if data["action"] == "revoke":
        row.revoked_at = timezone.now()
        row.encrypted_token, row.otp_hash, row.proof_hash = "", "", ""
        result = {"ok": True}
    else:
        if row.revoked_at:
            raise DomainError(
                "INVALID_INVITATION", "Create a new invitation after revocation.", 409
            )
        token = secrets.token_urlsafe(32)
        settings_input(
            actor,
            {
                **row.settings,
                "roles": row.roles,
                "branch_id": str(row.branch_id) if row.branch_id else None,
            },
        )
        row.issued_by = request.user
        row.token_hash = digest(token)
        row.encrypted_token = cipher().encrypt(token.encode()).decode()
        row.expires_at = timezone.now() + timedelta(days=3)
        row.proof_hash, row.otp_hash = "", ""
        row.verified_at = None
        result = {"link": f"{get_settings().web_origin}/staff/onboarding/{token}"}
        queue_mail(row, "staff_invitation", link=result["link"])
    row.version += 1
    row.save()
    audit(request.user, f"staff.invitation.{data['action']}", actor.organization_id, row.id)
    return result
