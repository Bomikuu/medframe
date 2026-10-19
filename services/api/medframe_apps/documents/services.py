from pathlib import PurePath
from uuid import UUID, uuid4

from django.core import signing
from django.db import transaction

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.documents.models import Document, DocumentVersion
from medframe_apps.documents.storage import receive_version_bytes
from medframe_apps.documents.storage import validate_bytes as validate_bytes
from medframe_apps.organizations.policy import require_membership
from medframe_apps.patients.services import require_patient

TYPES = {
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/webp": {".webp"},
    "application/pdf": {".pdf"},
}


def require_document(user, organization_id, version_id, *, write=False):
    version = (
        DocumentVersion.objects.select_related("document")
        .filter(id=version_id, document__organization_id=organization_id)
        .first()
    )
    if version is None:
        raise DomainError("NOT_FOUND", "Document is unavailable.", 404)
    document = version.document
    if document.purpose == "diagnostic":
        raise DomainError("NOT_FOUND", "Use the authorized diagnostic request for this file.", 404)
    if document.purpose == "clinical":
        require_patient(
            user,
            organization_id,
            document.patient_id,
            "patients.clinical.write" if write else "patients.clinical.read",
            lock=write,
        )
        if write:
            require_membership(user, organization_id, "documents.write")
    elif document.purpose in {"logo", "avatar"}:
        require_membership(
            user,
            organization_id,
            "organization.manage" if write and document.purpose == "logo" else "workspace.read",
        )
        if document.purpose == "avatar" and document.uploaded_by_id != user.id:
            raise DomainError("NOT_FOUND", "Profile image is unavailable.", 404)
    else:
        raise DomainError("NOT_FOUND", "File purpose is unavailable.", 404)
    return version


def require_asset(user, organization_id, version_id, purpose):
    try:
        identifier = UUID(str(version_id))
    except ValueError:
        raise DomainError("INVALID_INPUT", "Choose an uploaded image.") from None
    version = require_document(user, organization_id, identifier)
    if version.document.purpose != purpose or version.scan_state != "clean":
        raise DomainError(
            "UNSAFE_DOCUMENT", "Choose an image that has completed its security scan."
        )
    return version


@transaction.atomic
def begin_document_upload(user, organization_id, patient_id, encounter_id, purpose, metadata):
    if purpose not in {"clinical", "logo", "avatar"}:
        raise DomainError("INVALID_INPUT", "Choose a supported upload purpose.")
    if purpose == "clinical":
        require_membership(user, organization_id, "documents.write")
        require_patient(user, organization_id, patient_id, "patients.clinical.write", lock=True)
        if encounter_id:
            from medframe_apps.encounters.services import editable, require_encounter

            encounter = require_encounter(user, organization_id, encounter_id, write=True)
            if encounter.patient_id != patient_id or not editable(encounter):
                raise DomainError("INVALID_INPUT", "Choose the patient's editable consultation.")
    else:
        require_membership(
            user, organization_id, "organization.manage" if purpose == "logo" else "workspace.read"
        )
        if patient_id or encounter_id:
            raise DomainError(
                "INVALID_INPUT", "Branding and profile images cannot reference a clinical record."
            )
    if not isinstance(metadata, dict) or set(metadata) - {
        "filename",
        "content_type",
        "size",
        "label",
        "document_id",
    }:
        raise DomainError("INVALID_INPUT", "Use supported file metadata.")
    filename = metadata.get("filename", "")
    content_type = metadata.get("content_type")
    size = metadata.get("size")
    label = metadata.get("label", "")
    if (
        not isinstance(filename, str)
        or not 1 <= len(filename) <= 160
        or any(ord(char) < 32 for char in filename)
        or "/" in filename
        or "\\" in filename
    ):
        raise DomainError("INVALID_INPUT", "Use a plain filename of up to 160 characters.")
    if (
        content_type not in TYPES
        or PurePath(filename).suffix.lower() not in TYPES[content_type]
        or (purpose != "clinical" and content_type == "application/pdf")
    ):
        raise DomainError("INVALID_INPUT", "Choose a JPEG, PNG, WebP image or a clinical PDF.")
    limit = 20 * 1024 * 1024 if purpose == "clinical" else 2 * 1024 * 1024
    if (
        type(size) is not int
        or not 1 <= size <= limit
        or not isinstance(label, str)
        or not 1 <= len(label.strip()) <= 120
    ):
        raise DomainError(
            "INVALID_INPUT", "Check the file size and add a label of up to 120 characters."
        )
    document_id = metadata.get("document_id")
    if document_id:
        previous = (
            DocumentVersion.objects.filter(
                document_id=document_id, document__organization_id=organization_id
            )
            .order_by("-version")
            .first()
        )
        if previous is None:
            raise DomainError("NOT_FOUND", "Original document is unavailable.", 404)
        previous = require_document(user, organization_id, previous.id, write=True)
        document = Document.objects.select_for_update().get(id=previous.document_id)
        if (
            document.patient_id != patient_id
            or document.encounter_id != encounter_id
            or document.purpose != purpose
        ):
            raise DomainError(
                "INVALID_INPUT", "A new version must retain its original record association."
            )
        version_number = document.versions.order_by("-version").first().version + 1
    else:
        document = Document.objects.create(
            organization_id=organization_id,
            patient_id=patient_id,
            encounter_id=encounter_id,
            uploaded_by=user,
            purpose=purpose,
            label=label.strip(),
        )
        version_number = 1
    version = DocumentVersion.objects.create(
        uploaded_by=user,
        document=document,
        version=version_number,
        key=f"private/{organization_id}/{uuid4().hex}",
        filename=filename,
        content_type=content_type,
        expected_size=size,
    )
    audit(user, "document.upload.started", organization_id, version.id)
    return version


@transaction.atomic
def complete_document_upload(user, organization_id, version_id, uploaded_file):
    initial = require_document(user, organization_id, version_id, write=True)
    version = DocumentVersion.objects.select_for_update().get(id=initial.id)
    if version.uploaded_by_id != user.id or version.scan_state != "uploading":
        raise DomainError(
            "CONFLICT", "This upload is already received or belongs to another user.", 409
        )
    if (
        uploaded_file.size != version.expected_size
        or uploaded_file.content_type != version.content_type
    ):
        raise DomainError("INVALID_FILE", "File size or type does not match the upload request.")
    if version.document.encounter_id:
        from medframe_apps.encounters.services import editable, require_encounter

        encounter = require_encounter(
            user, organization_id, version.document.encounter_id, write=True
        )
        if not editable(encounter):
            raise DomainError("IMMUTABLE", "This consultation is no longer editable.", 409)
    receive_version_bytes(version, uploaded_file)
    audit(user, "document.upload.received", organization_id, version.id)
    return version


def validate_encounter_documents(user, encounter, identifiers, *, clean):
    for identifier in identifiers:
        version = require_document(user, encounter.organization_id, identifier)
        if (
            version.document.patient_id != encounter.patient_id
            or version.document.encounter_id not in {None, encounter.id}
            or version.document.purpose != "clinical"
        ):
            raise DomainError("INVALID_INPUT", "Document belongs to another clinical record.")
        if clean and version.scan_state != "clean":
            raise DomainError(
                "UNSAFE_DOCUMENT",
                "Wait for all document scans or explicitly remove pending attachments "
                "before finalizing.",
                409,
            )


def authorize_document_download(user, organization_id, version_id):
    version = require_document(user, organization_id, version_id)
    if version.scan_state != "clean":
        raise DomainError("UNSAFE_DOCUMENT", "This file is not cleared for download.", 409)
    return signing.dumps(
        {"version": str(version.id), "organization": str(organization_id), "user": str(user.id)},
        salt="document-download",
    )
