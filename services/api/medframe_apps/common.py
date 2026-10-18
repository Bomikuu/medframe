from uuid import uuid4

from django.db import connection, models
from django.utils import timezone

from config.errors import DomainError


class Record(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        abstract = True


def advisory_lock(key: str) -> None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", [key])


def check_version(actual: int, expected: int) -> None:
    if actual != expected:
        raise DomainError(
            "CONFLICT", "This record changed. Review the latest version before saving.", 409
        )


def check_page(first: int) -> None:
    if not 1 <= first <= 50:
        raise DomainError("INVALID_INPUT", "Choose a page size between 1 and 50.")
