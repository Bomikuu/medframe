import re
import secrets
import subprocess

from django.utils import timezone

from config.errors import DomainError
from medframe_apps.common import advisory_lock
from medframe_apps.websites.models import WebsiteDomain


def hostname(value):
    value = str(value).strip().lower().rstrip(".")
    if value.endswith((".local", ".internal", ".localhost", ".test", ".invalid")):
        raise DomainError("INVALID_INPUT", "Use a public domain you control.")
    if len(value) > 253 or not re.fullmatch(
        r"(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", value
    ):
        raise DomainError(
            "INVALID_INPUT", "Enter a public hostname without a scheme, port or path."
        )
    return value


def prepare(website, value):
    name = hostname(value)
    row, _ = WebsiteDomain.objects.update_or_create(
        website=website,
        defaults={
            "hostname": name,
            "challenge": "medframe=" + secrets.token_urlsafe(32),
            "verified_at": None,
        },
    )
    return row


def verify(website):
    row = WebsiteDomain.objects.filter(website=website).first()
    if not row:
        raise DomainError("INVALID_INPUT", "Add a custom domain first.")
    advisory_lock("website-domain:" + row.hostname)
    if (
        WebsiteDomain.objects.filter(hostname=row.hostname, verified_at__isnull=False)
        .exclude(pk=row.pk)
        .exists()
    ):
        raise DomainError("CONFLICT", "This hostname is already verified for another website.", 409)
    try:
        result = subprocess.run(
            ["dig", "+short", "+time=2", "+tries=1", "TXT", "_medframe." + row.hostname],
            capture_output=True,
            text=True,
            timeout=4,
            check=True,
        )
    except (OSError, subprocess.SubprocessError):
        raise DomainError(
            "UNAVAILABLE", "DNS verification is unavailable. Keep the record and try later.", 503
        ) from None
    records = [line.replace('"', "").replace(" ", "") for line in result.stdout.splitlines()]
    if row.challenge not in records:
        raise DomainError(
            "DNS_PENDING",
            "The ownership TXT record is not visible yet. Check the value and try later.",
            409,
        )
    row.verified_at = timezone.now()
    row.save(update_fields=["verified_at"])
    return row
