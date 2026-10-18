from django.core import signing
from django.db import transaction
from django.db.models import OuterRef, Subquery

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.portal.models import PortalRelease, ReleaseDocument, ReleaseEvent
from medframe_apps.portal.policy import require_portal_link
from medframe_apps.portal.releases import release_state
from medframe_apps.record_filters import page_records


def published_releases(link):
    latest = (
        ReleaseEvent.objects.filter(release_id=OuterRef("pk"))
        .order_by("-version")
        .values("state")[:1]
    )
    return (
        PortalRelease.objects.filter(
            organization_id=link.organization_id, patient_id=link.patient_id
        )
        .annotate(live_state=Subquery(latest))
        .filter(live_state="published")
    )


def release_details(item, *, content=False):
    state = release_state(item)
    result = {
        "id": str(item.id),
        "sequence": item.sequence,
        "created_at": item.created_at.isoformat(),
        "author": item.author.display_name,
        "summary": item.payload["summary"],
        "state": state.state,
        "state_version": state.version,
    }
    if content:
        result["payload"] = item.payload
    return result


def portal_records(request, link_id, after=None):
    link = require_portal_link(request, link_id)
    return page_records(
        published_releases(link).select_related("author"),
        scope=f"portal-records:{request.user.id}:{link.id}",
        after=after,
        serialize=release_details,
    )


def portal_record(request, link_id, release_id):
    link = require_portal_link(request, link_id)
    item = published_releases(link).select_related("author").filter(id=release_id).first()
    if item is None:
        raise DomainError("NOT_FOUND", "This released record is unavailable.", 404)
    audit(request.user, "portal.record.read", link.organization_id, item.id)
    return release_details(item, content=True)


@transaction.atomic
def authorize_portal_download(request, link_id, release_id, version_id):
    link = require_portal_link(request, link_id, lock=True)
    if not published_releases(link).filter(id=release_id).exists():
        raise DomainError("NOT_FOUND", "This release is unavailable.", 404)
    attachment = (
        ReleaseDocument.objects.select_related("version")
        .filter(release_id=release_id, version_id=version_id, version__scan_state="clean")
        .first()
    )
    if attachment is None:
        raise DomainError("NOT_FOUND", "This released file is unavailable.", 404)
    return signing.dumps(
        {
            "purpose": "release",
            "user": str(request.user.id),
            "link": str(link.id),
            "release": str(release_id),
            "version": str(version_id),
        },
        salt="portal-file",
    )
