"""Private byte handling only; callers must establish live domain authorization."""

import hashlib
import io
import re
from pathlib import PurePath

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from PIL import Image, UnidentifiedImageError

from config.errors import DomainError

TYPES = {
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/webp": {".webp"},
    "application/pdf": {".pdf"},
}


def validate_bytes(data, content_type, purpose):
    if content_type == "application/pdf":
        if not data.startswith(b"%PDF-") or b"%%EOF" not in data[-2048:]:
            raise DomainError("INVALID_FILE", "The PDF signature is invalid.")
        # PDFs are served as attachments; active content is rejected before quarantine.
        if re.search(rb"/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b", data):
            raise DomainError("INVALID_FILE", "Use a PDF without embedded active content.")
        return data
    try:
        with Image.open(io.BytesIO(data)) as image:
            expected = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}[
                content_type
            ]
            if image.format != expected or image.width * image.height > 20_000_000:
                raise ValueError("Image format or dimensions")
            if purpose not in {"clinical", "diagnostic"} and max(image.size) > 2048:
                raise ValueError("Profile/logo dimension limit")
            image.verify()
        if purpose not in {"clinical", "diagnostic"}:
            with Image.open(io.BytesIO(data)) as image:
                output = io.BytesIO()
                image.convert("RGB" if content_type == "image/jpeg" else "RGBA").save(
                    output, format=expected
                )
                result = output.getvalue()
                if len(result) > 2 * 1024 * 1024:
                    raise ValueError("Re-encoded asset size")
                return result
        return data
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise DomainError(
            "INVALID_FILE",
            "Choose a valid image. Profile and logo images must be at most 2048 pixels per side.",
        ) from None


def validate_upload_metadata(purpose, metadata):
    if not isinstance(metadata, dict) or set(metadata) - {
        "filename",
        "content_type",
        "size",
        "label",
    }:
        raise DomainError("INVALID_INPUT", "Use supported file metadata.")
    filename = metadata.get("filename", "")
    content_type = metadata.get("content_type", "")
    label = metadata.get("label", "")
    size = metadata.get("size")
    if (
        not isinstance(filename, str)
        or not 1 <= len(filename) <= 160
        or any(ord(c) < 32 or c in "/\\" for c in filename)
    ):
        raise DomainError("INVALID_INPUT", "Use a plain filename of up to 160 characters.")
    if (
        not isinstance(content_type, str)
        or content_type not in TYPES
        or PurePath(filename).suffix.lower() not in TYPES[content_type]
    ):
        raise DomainError(
            "INVALID_FILE", "Choose JPEG, PNG, WebP or PDF; DICOM is not supported yet."
        )
    if purpose not in {"clinical", "diagnostic", "logo", "avatar"}:
        raise DomainError("INVALID_INPUT", "Unsupported file purpose.")
    limit = 20 * 1024 * 1024 if purpose in {"clinical", "diagnostic"} else 2 * 1024 * 1024
    if (
        type(size) is not int
        or not 1 <= size <= limit
        or not isinstance(label, str)
        or not 1 <= len(label.strip()) <= 120
    ):
        raise DomainError(
            "INVALID_INPUT", "Check file size and add a label of up to 120 characters."
        )
    return {
        "filename": filename,
        "content_type": content_type,
        "expected_size": size,
        "label": label.strip(),
    }


def receive_version_bytes(version, uploaded_file):
    if (
        version.scan_state != "uploading"
        or uploaded_file.size != version.expected_size
        or uploaded_file.content_type != version.content_type
    ):
        raise DomainError(
            "INVALID_FILE", "This upload is already received or its size/type changed."
        )
    data = validate_bytes(uploaded_file.read(), version.content_type, version.document.purpose)
    version.key = default_storage.save(version.key, ContentFile(data))
    version.size = len(data)
    version.sha256 = hashlib.sha256(data).hexdigest()
    version.scan_state = "pending"
    version.save()
    from medframe_apps.documents.tasks import enqueue_scan

    transaction.on_commit(lambda: enqueue_scan(version.id))
    return version
