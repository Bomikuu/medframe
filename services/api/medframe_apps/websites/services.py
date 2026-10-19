import re

from django.db import IntegrityError, transaction

from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.auditing.services import audit
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.documents.models import DocumentVersion
from medframe_apps.organizations.models import Branch
from medframe_apps.organizations.policy import require_membership
from medframe_apps.websites import domains
from medframe_apps.websites.content import asset_ids, defaults, validated
from medframe_apps.websites.models import ClinicWebsite, WebsiteDomain, WebsitePublication


def administrator(request, organization_id):
    require_session_realm(request, "staff")
    if getattr(request, "station_access", None) or getattr(request, "station_doctor", None):
        raise DomainError("FORBIDDEN", "Use your authenticated clinic workstation.", 403)
    return require_membership(request.user, organization_id, "organization.manage")


def check_assets(website, content):
    selected = asset_ids(content)
    rows = DocumentVersion.objects.filter(
        id__in=selected,
        document__organization_id=website.organization_id,
        document__purpose__in=["website", "logo"],
        document__patient__isnull=True,
        document__encounter__isnull=True,
        scan_state="clean",
        content_type__in=["image/jpeg", "image/png", "image/webp"],
    )
    if rows.count() != len(selected):
        raise DomainError(
            "UNSAFE_DOCUMENT",
            "Select only clean website images or clinic logos uploaded to this organization.",
            409,
        )
    branch = content.get("queue_branch_id")
    if (
        branch
        and not Branch.objects.filter(id=branch, organization_id=website.organization_id).exists()
    ):
        raise DomainError("INVALID_INPUT", "Choose a branch in this clinic.")


def summary(website):
    domain = WebsiteDomain.objects.filter(website=website).first()
    return {
        "id": str(website.id),
        "slug": website.slug,
        "version": website.version,
        "content": website.content,
        "published_number": website.published.number if website.published_id else None,
        "published_content": website.published.content if website.published_id else None,
        "history": [
            {"id": str(row.id), "number": row.number, "created_at": row.created_at.isoformat()}
            for row in website.publications.order_by("-number")[:20]
        ],
        "domain": {
            "hostname": domain.hostname,
            "challenge": domain.challenge,
            "verified": bool(domain.verified_at),
        }
        if domain
        else None,
    }


@transaction.atomic
def setup(request, organization_id):
    member = administrator(request, organization_id)
    website = (
        ClinicWebsite.objects.select_related("published")
        .filter(organization_id=organization_id)
        .first()
    )
    assets = (
        DocumentVersion.objects.filter(
            document__organization_id=organization_id,
            document__purpose__in=["website", "logo"],
            document__patient__isnull=True,
            document__encounter__isnull=True,
        )
        .select_related("document")
        .order_by("-created_at")[:60]
    )
    return {
        "website": summary(website) if website else None,
        "defaults": defaults(member.organization.name),
        "assets": [
            {"id": str(row.id), "label": row.document.label, "state": row.scan_state}
            for row in assets
        ],
    }


@transaction.atomic
def action(request, organization_id, kind, data, expected_version):
    administrator(request, organization_id)
    advisory_lock("website:" + str(organization_id))
    website = (
        ClinicWebsite.objects.select_related("published")
        .select_for_update(of=("self",))
        .filter(organization_id=organization_id)
        .first()
    )
    check_version(website.version if website else 0, expected_version)
    if kind == "save":
        slug = str(data.get("slug", ""))
        if not re.fullmatch(r"[a-z][a-z0-9-]{1,58}[a-z0-9]", slug) or slug in {
            "admin",
            "clinic",
            "login",
            "portal",
            "station",
            "api",
        }:
            raise DomainError(
                "INVALID_INPUT",
                "Use a unique clinic address of 3–60 lowercase letters, numbers and hyphens.",
            )
        content = validated(data.get("content"))
        if website and website.publications.exists() and slug != website.slug:
            raise DomainError(
                "INVALID_INPUT", "The website address stays fixed after first publication."
            )
        website = website or ClinicWebsite(organization_id=organization_id)
        check_assets(website, content)
        website.slug, website.content = slug, content
    elif not website:
        raise DomainError("NOT_FOUND", "Save a website draft first.", 404)
    elif kind == "publish":
        if data.get("reviewed") is not True:
            raise DomainError(
                "REVIEW_REQUIRED",
                "Review and approve the website content and images for public release.",
            )
        content = validated(website.content)
        check_assets(website, content)
        if not content["headline"] or not content["seo_title"] or not content["seo_description"]:
            raise DomainError(
                "INVALID_INPUT",
                "Add a headline, page title and search description before publishing.",
            )
        number = (
            website.publications.order_by("-number").values_list("number", flat=True).first() or 0
        ) + 1
        website.published = WebsitePublication.objects.create(
            website=website, number=number, content=content, actor=request.user
        )
    elif kind == "unpublish":
        website.published = None
    elif kind == "restore":
        revision = website.publications.filter(id=data.get("revision_id")).first()
        if not revision:
            raise DomainError("NOT_FOUND", "This publication is unavailable.", 404)
        website.content = validated(revision.content)
    elif kind == "domain_prepare":
        domains.prepare(website, data.get("hostname", ""))
    elif kind == "domain_verify":
        domains.verify(website)
    else:
        raise DomainError("INVALID_INPUT", "Choose a website action.")
    website.version = (
        (website.version + 1)
        if website.pk and ClinicWebsite.objects.filter(pk=website.pk).exists()
        else 1
    )
    try:
        with transaction.atomic():
            website.save()
    except IntegrityError:
        raise DomainError("CONFLICT", "This website address is already in use.", 409) from None
    audit(request.user, "website." + kind, organization_id, website.id)
    return summary(website)
