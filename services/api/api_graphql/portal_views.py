import json

from django.http import JsonResponse
from django.views.decorators.http import require_POST

from api_graphql.limits import validate_query
from api_graphql.portal_schema import schema
from config.errors import DomainError
from config.middleware import domain_view
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.accounts.throttling import throttle


@require_POST
@domain_view
def graphql(request):
    require_session_realm(request, "patient")
    data = json.loads(request.body)
    if not isinstance(data, dict) or not isinstance(data.get("query"), str):
        raise DomainError("INVALID_QUERY", "Use one GraphQL operation per request.")
    validate_query(data["query"])
    throttle(request, "portal-graphql", str(request.user.id), 120, 60)
    result = schema.execute_sync(
        data["query"], variable_values=data.get("variables"), context_value=request
    )
    if result.errors:
        return JsonResponse(
            {
                "data": None,
                "errors": [
                    {
                        "message": error.original_error.message
                        if isinstance(error.original_error, DomainError)
                        else "The request could not be completed.",
                        "extensions": {
                            "code": error.original_error.code
                            if isinstance(error.original_error, DomainError)
                            else "INVALID_QUERY"
                        },
                    }
                    for error in result.errors
                ],
            }
        )
    return JsonResponse({"data": result.data})
