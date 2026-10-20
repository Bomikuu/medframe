from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_POST

from config.middleware import domain_view, json_object
from medframe_apps.interoperability.review import download_export, review_export


@require_POST
@domain_view
def preview(request):
    return JsonResponse(review_export(request, json_object(request)))


@require_POST
@domain_view
def download(request):
    envelope, body = download_export(request, json_object(request))
    response = HttpResponse(body, content_type="application/json")
    response["Content-Disposition"] = (
        f'attachment; filename="medframe-revision-{envelope.revision.id}.json"'
    )
    response["Cache-Control"] = "private, no-store"
    response["Content-Security-Policy"] = "sandbox; default-src 'none'"
    response["Referrer-Policy"] = "no-referrer"
    return response
