from zoneinfo import ZoneInfo

from django.core.files.storage import default_storage
from django.http import FileResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from config.errors import DomainError
from config.middleware import domain_view
from medframe_apps.documents.models import DocumentVersion
from medframe_apps.websites.content import asset_ids
from medframe_apps.websites.models import ClinicWebsite, WebsiteDomain


def published(slug):
    website = (
        ClinicWebsite.objects.select_related("published", "organization")
        .filter(slug=slug, organization__active=True, published__isnull=False)
        .first()
    )
    if not website:
        raise DomainError("NOT_FOUND", "This clinic website is unavailable.", 404)
    return website


def response(value):
    result = JsonResponse(value)
    result["Cache-Control"] = "no-store, private"
    return result


@require_GET
@domain_view
def page(request, slug):
    website = published(slug)
    queue = []
    content = website.published.content
    if content.get("queue_branch_id") and any(
        row["kind"] == "queue" and row["visible"] for row in content["sections"]
    ):
        from medframe_apps.operations.models import QueueTicket

        day = timezone.now().astimezone(ZoneInfo(website.organization.timezone)).date()
        queue = [
            {"number": row.number, "status": row.status}
            for row in QueueTicket.objects.filter(
                day__branch__organization=website.organization,
                day__branch_id=content["queue_branch_id"],
                day__date=day,
                status__in=["waiting", "called", "in_service"],
            ).order_by("order", "created_at")[:10]
        ]
    return response(
        {
            "slug": website.slug,
            "content": content,
            "published_at": website.published.created_at.isoformat(),
            "queue": queue,
        }
    )


@require_GET
@domain_view
def asset(request, slug, asset_id):
    website = published(slug)
    if str(asset_id) not in asset_ids(website.published.content):
        raise DomainError("NOT_FOUND", "This image is unavailable.", 404)
    version = DocumentVersion.objects.filter(
        id=asset_id,
        document__organization=website.organization,
        document__purpose__in=["website", "logo"],
        document__patient__isnull=True,
        document__encounter__isnull=True,
        scan_state="clean",
        content_type__in=["image/jpeg", "image/png", "image/webp"],
    ).first()
    if not version:
        raise DomainError("NOT_FOUND", "This image is unavailable.", 404)
    result = FileResponse(
        default_storage.open(version.key, "rb"), content_type=version.content_type
    )
    result["Cache-Control"] = "no-store, private"
    result["X-Content-Type-Options"] = "nosniff"
    return result


@require_GET
def index(request):
    rows = (
        ClinicWebsite.objects.filter(
            organization__active=True, published__isnull=False, published__content__indexable=True
        )
        .select_related("published")
        .order_by("slug")[:10000]
    )
    return response(
        {
            "sites": [
                {"slug": row.slug, "updated_at": row.published.created_at.isoformat()}
                for row in rows
            ]
        }
    )


@require_GET
def resolve(request):
    name = request.GET.get("hostname", "").lower()
    domain = (
        WebsiteDomain.objects.filter(
            hostname=name,
            verified_at__isnull=False,
            website__published__isnull=False,
            website__organization__active=True,
        )
        .select_related("website__published")
        .first()
    )
    return response(
        {
            "slug": domain.website.slug if domain else None,
            "indexable": bool(domain and domain.website.published.content.get("indexable")),
        }
    )
