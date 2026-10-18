from uuid import UUID

from django.core import signing
from django.core.files.storage import default_storage
from django.http import FileResponse
from django.views.decorators.http import require_GET

from config.errors import DomainError
from config.middleware import domain_view
from medframe_apps.auditing.services import audit
from medframe_apps.branding.models import OrganizationBranding
from medframe_apps.documents.models import DocumentVersion
from medframe_apps.portal.models import ReleaseDocument
from medframe_apps.portal.policy import require_portal_link
from medframe_apps.portal.records import published_releases


def current_logo(link):
    branding = OrganizationBranding.objects.filter(organization_id=link.organization_id).first()
    identifier = branding.settings.get("logo_id") if branding else None
    return (
        DocumentVersion.objects.filter(
            id=identifier,
            document__organization_id=link.organization_id,
            document__purpose="logo",
            scan_state="clean",
        ).first()
        if identifier
        else None
    )


def authorize_logo(request, link_id):
    link = require_portal_link(request, link_id)
    logo = current_logo(link)
    if logo is None:
        return None
    return signing.dumps(
        {
            "purpose": "logo",
            "user": str(request.user.id),
            "link": str(link.id),
            "version": str(logo.id),
        },
        salt="portal-file",
    )


@require_GET
@domain_view
def download(request):
    try:
        ticket = signing.loads(request.GET.get("ticket", ""), salt="portal-file", max_age=60)
        if ticket["user"] != str(request.user.id):
            raise ValueError()
        link = require_portal_link(request, UUID(ticket["link"]))
        identifier = UUID(ticket["version"])
        if ticket["purpose"] == "logo":
            version = current_logo(link)
            if version is None or version.id != identifier:
                raise ValueError()
        elif ticket["purpose"] == "release":
            release_id = UUID(ticket["release"])
            if not published_releases(link).filter(id=release_id).exists():
                raise ValueError()
            attachment = (
                ReleaseDocument.objects.select_related("version")
                .filter(release_id=release_id, version_id=identifier, version__scan_state="clean")
                .first()
            )
            if attachment is None:
                raise ValueError()
            version = attachment.version
        else:
            raise ValueError()
    except (signing.BadSignature, KeyError, ValueError):
        raise DomainError(
            "EXPIRED_DOWNLOAD", "This file link is unavailable. Request a new one.", 403
        ) from None
    audit(request.user, "portal.document.download", link.organization_id, version.id)
    response = FileResponse(
        default_storage.open(version.key, "rb"),
        as_attachment=ticket["purpose"] == "release",
        filename=version.filename,
        content_type=version.content_type,
    )
    response["Content-Security-Policy"] = "sandbox; default-src 'none'"
    response["Cache-Control"] = "private, no-store"
    return response
