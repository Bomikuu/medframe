"""Authorization belongs to the caller; only digests/opaque result IDs are retained."""

import hashlib
import json
from uuid import UUID

from config.errors import DomainError
from medframe_apps.auditing.models import RequestReceipt
from medframe_apps.common import advisory_lock


def request_digest(input_data):
    return hashlib.sha256(
        json.dumps(input_data, sort_keys=True, default=str, separators=(",", ":")).encode()
    ).hexdigest()


def replay_request(actor, organization_id, operation, key, input_data):
    try:
        key = UUID(str(key))
    except ValueError:
        raise DomainError("INVALID_INPUT", "Use a valid request key.") from None
    advisory_lock(f"request:{actor.id}:{organization_id}:{operation}:{key}")
    previous = RequestReceipt.objects.filter(
        actor=actor, organization_id=organization_id, operation=operation, key=key
    ).first()
    if previous and previous.digest != request_digest(input_data):
        raise DomainError("CONFLICT", "This request key was used with different details.", 409)
    return previous.result_id if previous else None


def record_request_result(actor, organization_id, operation, key, input_data, result_id):
    RequestReceipt.objects.create(
        actor=actor,
        organization_id=organization_id,
        operation=operation,
        key=key,
        digest=request_digest(input_data),
        result_id=result_id,
    )
