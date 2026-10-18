from uuid import UUID

from django.core import signing
from django.core.files.storage import default_storage
from django.http import FileResponse, JsonResponse
from django.views.decorators.http import require_GET, require_POST

from config.errors import DomainError
from config.middleware import domain_view
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.auditing.services import audit
from medframe_apps.documents.services import complete_document_upload, require_document


@require_POST
@domain_view
def upload(request, version_id):
    require_session_realm(request, "staff")
    try:
        organization_id = UUID(request.POST.get("organizationId", ""))
    except ValueError:
        raise DomainError("INVALID_INPUT", "Choose an authorized clinic.") from None
    uploaded_file = request.FILES.get("file")
    if uploaded_file is None or len(request.FILES) != 1 or uploaded_file.size > 20 * 1024 * 1024:
        raise DomainError("INVALID_FILE", "Choose one file no larger than 20MiB.")
    version = complete_document_upload(request.user, organization_id, version_id, uploaded_file)
    return JsonResponse({"id": str(version.id), "scanState": version.scan_state})


@require_GET
@domain_view
def download(request):
    require_session_realm(request, "staff")
    try:
        ticket = signing.loads(request.GET.get("ticket", ""), salt="document-download", max_age=60)
        if ticket["user"] != str(request.user.id):
            raise signing.BadSignature()
    except (signing.BadSignature, KeyError):
        raise DomainError(
            "EXPIRED_DOWNLOAD", "This download link expired. Request a new one.", 403
        ) from None
    version = require_document(request.user, UUID(ticket["organization"]), UUID(ticket["version"]))
    if version.scan_state != "clean":
        raise DomainError("UNSAFE_DOCUMENT", "This file is not available for download.", 409)
    audit(request.user, "document.download", version.document.organization_id, version.id)
    response = FileResponse(
        default_storage.open(version.key, "rb"),
        as_attachment=version.document.purpose == "clinical",
        filename=version.filename,
        content_type=version.content_type,
    )
    response["Content-Security-Policy"] = "sandbox; default-src 'none'"
    response["Cache-Control"] = "private, no-store"
    return response
