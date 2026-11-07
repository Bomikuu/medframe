"""Private, sanitized and scanned staff portraits; images are never made public."""

import io
import secrets

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.http import FileResponse

from config.errors import DomainError
from medframe_apps.accounts.sign_in_policy import authenticated_session
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version
from medframe_apps.documents.storage import validate_bytes
from medframe_apps.documents.tasks import scan_stream
from .models import StaffPhoto, StaffProfile
from .staff_onboarding import invitation, live_invitation, require_proof
from .staff_service import administrator, require_target


def require_schedule_portrait(request, photo):
    """Only the current portrait of a provider visible in native operations scope."""
    from medframe_apps.accounts.session_realms import require_session_realm
    from medframe_apps.operations.policy import require_provider_scope
    from medframe_apps.organizations.policy import require_membership
    from medframe_apps.providers.models import ProviderProfile

    require_session_realm(request, "staff")
    provider = ProviderProfile.objects.filter(
        membership_id=photo.membership_id,
        membership__organization_id=photo.organization_id,
        membership__staffprofile__photo=photo,
        membership__active=True,
        membership__user__is_active=True,
        membership__organization__active=True,
    ).first()
    if provider is None:
        raise DomainError("NOT_FOUND", "This provider photo is unavailable.", 404)
    member = require_membership(request.user, photo.organization_id, "operations.read")
    require_provider_scope(member, provider.id)


@transaction.atomic
def upload(request):
    file = request.FILES.get("file")
    if (
        len(request.FILES) != 1
        or not file
        or file.size > 2 * 1024 * 1024
        or file.content_type not in {"image/png", "image/jpeg", "image/webp"}
    ):
        raise DomainError("INVALID_FILE", "Choose one JPEG, PNG or WebP photo up to 2 MiB.")
    token = request.POST.get("token")
    row = member = profile = None
    if token:
        row = invitation(request, token, proof=True, lock=True)
        organization = row.organization
    else:
        actor = administrator(request, request.POST.get("organization_id"))
        member = require_target(actor, request.POST.get("membership_id"), lock=True)
        profile, _ = StaffProfile.objects.get_or_create(membership=member)
        check_version(profile.version, int(request.POST.get("version", "0")))
        organization = member.organization
    data = validate_bytes(file.read(), file.content_type, "avatar")
    try:
        state = scan_stream(io.BytesIO(data))
    except Exception:
        raise DomainError(
            "SCAN_UNAVAILABLE",
            "The photo security scan is unavailable. Your current photo was kept. Try again later.",
            503,
        ) from None
    if state != "clean":
        raise DomainError(
            "UNSAFE_FILE", "This photo did not pass its security scan. Choose another image."
        )
    key = default_storage.save(
        f"staff/{organization.id}/{secrets.token_hex(24)}", ContentFile(data)
    )
    photo = StaffPhoto.objects.create(
        organization=organization,
        membership=member,
        invitation=row,
        key=key,
        content_type=file.content_type,
        uploaded_by=request.user if request.user.is_authenticated else None,
    )
    if row:
        row.photo = photo
        row.save(update_fields=["photo"])
    else:
        profile.photo = photo
        profile.version += 1
        profile.save(update_fields=["photo", "version"])
        audit(request.user, "staff.photo.updated", organization.id, member.id)
    return {"photo_id": str(photo.id), "version": profile.version if profile else None}


def content(request, identifier):
    photo = (
        StaffPhoto.objects.select_related(
            "membership__user", "invitation__organization", "invitation__issued_by"
        )
        .filter(id=identifier)
        .first()
    )
    if not photo:
        raise DomainError("NOT_FOUND", "This photo is unavailable.", 404)
    if photo.membership_id:
        own = (
            request.user.is_authenticated
            and authenticated_session(request.user, request.session)
            and request.session.get("auth_realm", "staff") == "staff"
            and request.user.id == photo.membership.user_id
            and photo.membership.active
            and photo.membership.organization.active
        )
        if not own:
            try:
                actor = administrator(request, photo.organization_id)
                require_target(actor, photo.membership_id)
            except DomainError:
                require_schedule_portrait(request, photo)
    else:
        if not photo.invitation_id:
            raise DomainError("NOT_FOUND", "This photo is unavailable.", 404)
        live_invitation(photo.invitation)
        require_proof(request, photo.invitation)
    response = FileResponse(default_storage.open(photo.key, "rb"), content_type=photo.content_type)
    response["Content-Security-Policy"] = "default-src 'none'; sandbox"
    response["Cache-Control"] = "no-store, private"
    return response
