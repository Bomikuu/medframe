import json

from django.http import JsonResponse
from django.views.decorators.http import require_POST

from api_graphql.limits import validate_query
from api_graphql.schema import schema
from config.errors import DomainError
from config.middleware import domain_view
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.accounts.throttling import throttle
from medframe_apps.auditing.services import audit


@require_POST
@domain_view
def graphql(request):
    require_session_realm(request, "staff")
    data = json.loads(request.body)
    if not isinstance(data, dict) or not isinstance(data.get("query"), str):
        raise DomainError("INVALID_QUERY", "Use one GraphQL operation per request.")
    validate_query(data["query"])
    from medframe_apps.stations.access_scope import validate_graphql

    validate_graphql(request, data["query"], data.get("variables"))
    throttle(request, "graphql", str(request.user.id), 120, 60)
    result = schema.execute_sync(
        data["query"], variable_values=data.get("variables"), context_value=request
    )
    if result.errors:
        errors = []
        for error in result.errors:
            cause = error.original_error
            code = (
                cause.code
                if isinstance(cause, DomainError)
                else ("INTERNAL_ERROR" if cause else "INVALID_QUERY")
            )
            message = (
                cause.message
                if isinstance(cause, DomainError)
                else "The request could not be completed."
            )
            errors.append({"message": message, "extensions": {"code": code}})
        audit(request.user, "graphql.denied", outcome="denied")
        return JsonResponse({"data": None, "errors": errors})
    return JsonResponse({"data": result.data})
