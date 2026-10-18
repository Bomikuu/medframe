import hashlib
import socket
import struct

from celery import shared_task
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone

from config.runtime import get_settings
from medframe_apps.auditing.models import Notification
from medframe_apps.documents.models import DocumentVersion


def scan_stream(stream):
    settings = get_settings()
    with socket.create_connection(
        (settings.scanner_host, settings.scanner_port), timeout=10
    ) as client:
        client.settimeout(60)
        client.sendall(b"zINSTREAM\0")
        while chunk := stream.read(65536):
            client.sendall(struct.pack("!I", len(chunk)) + chunk)
        client.sendall(struct.pack("!I", 0))
        response = bytearray()
        while len(response) <= 4096:
            chunk = client.recv(4096)
            if not chunk:
                break
            response.extend(chunk)
            if b"\0" in chunk:
                break
    if bytes(response).strip(b"\0\n ") == b"stream: OK":
        return "clean"
    if b"FOUND" in response:
        return "rejected"
    raise OSError("Scanner did not return a conclusive result")


@shared_task(bind=True, max_retries=12)
def scan_document(self, version_id):
    version = DocumentVersion.objects.select_related("document").get(id=version_id)
    if version.scan_state not in {"pending", "unavailable"}:
        return
    try:
        with default_storage.open(version.key, "rb") as stream:
            data = stream.read(20 * 1024 * 1024 + 1)
        if len(data) != version.size or hashlib.sha256(data).hexdigest() != version.sha256:
            state = "rejected"
        else:
            import io

            state = scan_stream(io.BytesIO(data))
    except Exception:
        DocumentVersion.objects.filter(
            id=version.id, scan_state__in=["pending", "unavailable"]
        ).update(scan_state="unavailable")
        # Broker/log exception text must never include keys, filenames, or medical content.
        raise self.retry(
            exc=OSError("File security scan is unavailable"),
            countdown=min(30 * (self.request.retries + 1), 300),
        ) from None
    with transaction.atomic():
        version = (
            DocumentVersion.objects.select_for_update()
            .select_related("document")
            .get(id=version_id)
        )
        if version.scan_state not in {"pending", "unavailable"}:
            return
        version.scan_state = state
        version.scanned_at = timezone.now()
        version.scan_attempts += 1
        version.save(update_fields=["scan_state", "scanned_at", "scan_attempts"])
        Notification.objects.create(
            user_id=version.uploaded_by_id,
            organization_id=version.document.organization_id,
            kind="document_" + state,
            resource_id=version.id,
        )


def enqueue_scan(version_id):
    try:
        scan_document.delay(str(version_id))
    except Exception:
        DocumentVersion.objects.filter(id=version_id, scan_state="pending").update(
            scan_state="unavailable"
        )
