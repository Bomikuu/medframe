import json
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.adapters.rate_limit import enforce_rate_limit, redis
from app.core.config import get_settings
from app.core.database import session_factory
from app.core.errors import DomainError
from app.core.http_security import SESSION_COOKIE, validate_unsafe_request
from app.core.request_context import RequestContext
from app.graphql.limits import validate_query
from app.graphql.schema import schema
from app.modules.audit.service import append_event
from app.modules.identity.routes import router
from app.modules.identity.sessions import authenticate_session


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Medframe API", docs_url=None, redoc_url=None, openapi_url=None)

    @app.middleware("http")
    async def private_boundary(request: Request, call_next):
        request.state.context = RequestContext(
            request_id=str(uuid4()),
            # Forwarded IPs are intentionally ignored until a trusted proxy is configured.
            client_address=request.client.host if request.client else "unknown",
            origin=request.headers.get("origin"),
        )
        if request.method not in {"GET", "HEAD"}:
            if request.headers.get("origin") != settings.web_origin:
                return JSONResponse(
                    {"code": "INVALID_ORIGIN", "message": "Reload and retry."}, status_code=403
                )
            if request.headers.get("content-type", "").split(";")[0] != "application/json":
                return JSONResponse(
                    {"code": "INVALID_CONTENT_TYPE", "message": "Use JSON requests."},
                    status_code=415,
                )
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 16384:
                    return JSONResponse(
                        {"code": "BODY_TOO_LARGE", "message": "Request is too large."},
                        status_code=413,
                    )
            request._body = bytes(body)
        response = await call_next(request)
        response.headers.update(
            {
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "no-referrer",
                "X-Request-ID": request.state.context.request_id,
            }
        )
        return response

    @app.exception_handler(DomainError)
    async def domain_error(request: Request, error: DomainError):
        async with session_factory.begin() as db:
            await append_event(
                db, None, request.state.context, "request.denied", outcome=error.code
            )
        headers = {"Retry-After": "900"} if error.status == 429 else None
        return JSONResponse(
            {
                "code": error.code,
                "message": error.message,
                "requestId": request.state.context.request_id,
            },
            status_code=error.status,
            headers=headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError):
        # Pydantic's default error includes input values, which can contain secrets.
        return JSONResponse(
            {
                "code": "INVALID_INPUT",
                "message": "Check your entries and try again.",
                "requestId": request.state.context.request_id,
            },
            status_code=422,
        )

    @app.get("/health/live")
    async def live():
        return {"status": "alive"}

    @app.get("/health/ready")
    async def ready():
        try:
            async with session_factory() as db:
                await db.execute(text("SELECT 1"))
            await redis.ping()
        except Exception:
            return JSONResponse({"status": "unavailable"}, status_code=503)
        return {"status": "ready"}

    @app.post("/graphql")
    async def graphql(request: Request):
        validate_unsafe_request(request)
        try:
            data = await request.json()
        except json.JSONDecodeError:
            raise DomainError("INVALID_QUERY", "Use a valid GraphQL request.") from None
        if not isinstance(data, dict) or not isinstance(data.get("query"), str):
            raise DomainError("INVALID_QUERY", "Use one GraphQL operation per request.")
        validate_query(data["query"])
        async with session_factory.begin() as db:
            principal = await authenticate_session(db, request.cookies.get(SESSION_COOKIE, ""))
        await enforce_rate_limit(
            "graphql", str(principal.user_id), request.state.context.client_address, 120, 60
        )
        result = await schema.execute(
            data["query"],
            variable_values=data.get("variables"),
            context_value={"principal": principal, "request_context": request.state.context},
        )
        if result.errors:
            errors = []
            async with session_factory.begin() as db:
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
                await append_event(
                    db, principal, request.state.context, "graphql.denied", outcome="denied"
                )
            return {"data": None, "errors": errors}
        return {"data": result.data}

    app.include_router(router)
    return app


app = create_app()
