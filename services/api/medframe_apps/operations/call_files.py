import io
from uuid import UUID, uuid4

from celery import shared_task
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.http import FileResponse

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.documents.storage import validate_bytes, validate_upload_metadata
from medframe_apps.documents.tasks import scan_stream
from medframe_apps.operations.call_models import RoomAttachment
from medframe_apps.operations.call_policy import participant_for, room_for
from medframe_apps.operations.call_service import notify


@transaction.atomic
def upload(request, identifier):
    room_for(identifier, lock=True)
    row, participant = participant_for(request, identifier)
    file = request.FILES.get("file")
    if not file or len(request.FILES) != 1:
        raise DomainError("INVALID_FILE", "Choose one PDF, JPEG, PNG or WebP file.")
    metadata = validate_upload_metadata(
        "clinical",
        {
            "filename": file.name,
            "content_type": file.content_type,
            "size": file.size,
            "label": "Shared during online appointment",
        },
    )
    request_id = UUID(request.POST.get("request_id", ""))
    existing = RoomAttachment.objects.filter(participant=participant, request_id=request_id).first()
    if existing:
        if existing.filename != metadata["filename"] or existing.size != metadata["expected_size"]:
            raise DomainError("CONFLICT", "This upload retry has changed.", 409)
        return existing
    if RoomAttachment.objects.filter(room=row).count() >= 100:
        raise DomainError("CONFLICT", "This room has reached its attachment limit.", 409)
    data = validate_bytes(file.read(), file.content_type, "clinical")
    participant_for(request, identifier)
    key = default_storage.save(f"calls/{row.id}/{uuid4().hex}", ContentFile(data))
    try:
        participant_for(request, identifier)
    except DomainError:
        default_storage.delete(key)
        raise
    item = RoomAttachment.objects.create(
        room=row,
        participant=participant,
        request_id=request_id,
        filename=metadata["filename"],
        content_type=metadata["content_type"],
        size=len(data),
        key=key,
    )
    audit(request.user, "call.file_received", row.appointment.organization_id, item.id)
    transaction.on_commit(lambda: scan_attachment.delay(str(item.id)))
    return item


@shared_task(bind=True, max_retries=3)
def scan_attachment(self, identifier):
    item = RoomAttachment.objects.get(id=identifier)
    if item.scan_state not in {"pending", "unavailable"}:
        return
    try:
        with default_storage.open(item.key, "rb") as stream:
            state = scan_stream(stream)
    except OSError as error:
        RoomAttachment.objects.filter(id=item.id).update(scan_state="unavailable")
        notify(item.room_id)
        raise self.retry(exc=OSError("Room file scan unavailable"), countdown=30) from error
    RoomAttachment.objects.filter(id=item.id).update(scan_state=state)
    notify(item.room_id)


def download(request, identifier):
    item = RoomAttachment.objects.filter(id=identifier).first()
    if not item:
        raise DomainError("NOT_FOUND", "This room file is unavailable.", 404)
    participant_for(request, item.room_id)
    if item.scan_state != "clean":
        raise DomainError(
            "FILE_PENDING", "This file is not available until its security scan succeeds.", 403
        )
    response = FileResponse(
        default_storage.open(item.key, "rb"),
        content_type=item.content_type,
        as_attachment=True,
        filename=item.filename,
    )
    response["Content-Security-Policy"] = "default-src 'none'; sandbox"
    response["Cache-Control"] = "no-store, private"
    return response
