import hashlib
import secrets

from django.core import signing
from django.db import transaction
from django.utils import timezone
from pydantic import ValidationError

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.expansion_policy import require_native_staff
from medframe_apps.interoperability.records import export_record
from medframe_apps.interoperability.schema import Selection

SALT = "medframe-clinical-export-v1"


def selection_input(data):
    try:
        result = Selection.model_validate(data)
        if len(set(result.sections)) != len(result.sections):
            raise ValueError()
        result.sections.sort()
        return result
    except (ValidationError, ValueError):
        raise DomainError(
            "INVALID_INPUT", "Choose a revision and distinct supported sections."
        ) from None


@transaction.atomic
def review_export(request, data):
    require_native_staff(request)
    selection = selection_input(data)
    generated_at = timezone.now().isoformat()
    envelope, body = export_record(request, selection, generated_at)
    digest = hashlib.sha256(body).hexdigest()
    proof = signing.dumps(
        {
            "user": str(request.user.id),
            "selection": selection.model_dump(mode="json"),
            "generated_at": generated_at,
            "digest": digest,
        },
        salt=SALT,
        compress=True,
    )
    audit(
        request.user,
        "clinical.export.review." + digest,
        selection.organization_id,
        selection.revision_id,
    )
    return {
        "proof": proof,
        "expires_in": 600,
        "bytes": len(body),
        "digest": digest,
        "schema_version": envelope.schema_version,
        "patient": envelope.patient.model_dump(mode="json"),
        "revision": envelope.revision.model_dump(mode="json"),
        "sections": selection.sections,
    }


@transaction.atomic
def download_export(request, data):
    require_native_staff(request)
    if data.get("acknowledged") is not True:
        raise DomainError("REVIEW_REQUIRED", "Confirm the local download before continuing.")
    if not isinstance(data.get("proof"), str) or len(data["proof"]) > 8192:
        raise DomainError("REVIEW_EXPIRED", "Review this export again before downloading.", 403)
    try:
        proof = signing.loads(data.get("proof", ""), salt=SALT, max_age=600)
        if proof["user"] != str(request.user.id):
            raise signing.BadSignature()
        selection = selection_input(proof["selection"])
        generated_at = proof["generated_at"]
    except (signing.BadSignature, KeyError, TypeError, ValueError):
        raise DomainError(
            "REVIEW_EXPIRED", "Review this export again before downloading.", 403
        ) from None
    envelope, body = export_record(request, selection, generated_at)
    digest = hashlib.sha256(body).hexdigest()
    if not secrets.compare_digest(digest, proof["digest"]):
        raise DomainError("REVIEW_CHANGED", "Record details changed. Review the export again.", 409)
    audit(
        request.user,
        "clinical.export.download." + digest,
        selection.organization_id,
        selection.revision_id,
    )
    return envelope, body
