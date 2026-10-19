from uuid import UUID

from django.core.files.storage import default_storage
from django.http import FileResponse, JsonResponse
from django.views.decorators.http import require_GET, require_POST

from config.errors import DomainError
from config.middleware import domain_view
from medframe_apps.diagnostics.files import complete_result_upload, redeem_ticket


@require_POST
@domain_view
def upload(request, version_id):
    try:
        organization_id = UUID(request.POST.get("organizationId", ""))
    except ValueError:
        raise DomainError("INVALID_INPUT", "Choose the diagnostic center workspace.") from None
    file = request.FILES.get("file")
    if file is None or len(request.FILES) != 1 or file.size > 20 * 1024 * 1024:
        raise DomainError("INVALID_FILE", "Choose one file no larger than 20MiB.")
    version = complete_result_upload(request, organization_id, version_id, file)
    return JsonResponse({"id": str(version.id), "scanState": version.scan_state})


@require_GET
@domain_view
def download(request):
    version = redeem_ticket(request, request.GET.get("ticket", ""))
    response = FileResponse(
        default_storage.open(version.key, "rb"),
        as_attachment=True,
        filename=version.filename,
        content_type=version.content_type,
    )
    response["Content-Security-Policy"] = "sandbox; default-src 'none'"
    response["Cache-Control"] = "private, no-store"
    return response
