from uuid import UUID

from django.http import HttpResponse
from django.views.decorators.http import require_POST

from config.middleware import domain_view, json_object
from medframe_apps.analytics.csv_export import render_csv


@require_POST
@domain_view
def analytics_csv(request):
    data = json_object(request)
    body = render_csv(
        request,
        UUID(data["organization_id"]),
        UUID(data["branch_id"]),
        data.get("days", 30),
        data["sections"],
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
    )
    response = HttpResponse(body, content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="medframe-analytics.csv"'
    response["Cache-Control"] = "private, no-store"
    return response
