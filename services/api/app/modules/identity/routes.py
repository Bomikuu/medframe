from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.rate_limit import enforce_rate_limit, refund_successful_attempt
from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import DomainError
from app.core.http_security import (
    BOOTSTRAP_COOKIE,
    CHALLENGE_COOKIE,
    SESSION_COOKIE,
    validate_unsafe_request,
)
from app.core.security import csrf_for, new_token
from app.modules.identity.mfa import begin_mfa_enrollment, complete_mfa
from app.modules.identity.passwords import normalize_email
from app.modules.identity.recovery import request_password_reset, reset_password
from app.modules.identity.sessions import authenticate_session, begin_login, revoke_session

router = APIRouter(prefix="/auth")


class LoginInput(BaseModel):
    email: str = Field(max_length=320)
    password: str = Field(max_length=128)


class CodeInput(BaseModel):
    code: str = Field(min_length=1, max_length=32)


class RecoveryInput(BaseModel):
    email: str = Field(max_length=320)


class ResetInput(BaseModel):
    token: str = Field(max_length=128)
    password: str = Field(min_length=15, max_length=128)


def set_cookie(response: Response, name: str, token: str, max_age: int) -> None:
    response.set_cookie(
        name,
        token,
        httponly=True,
        secure=get_settings().cookie_secure,
        samesite="lax",
        path="/",
        max_age=max_age,
    )


@router.get("/csrf")
async def csrf(request: Request, response: Response):
    if request.headers.get("origin") != get_settings().web_origin:
        raise DomainError("INVALID_ORIGIN", "Reload this page and try again.", 403)
    token = (
        request.cookies.get(SESSION_COOKIE)
        or request.cookies.get(CHALLENGE_COOKIE)
        or request.cookies.get(BOOTSTRAP_COOKIE)
    )
    if not token:
        token = new_token()
        set_cookie(response, BOOTSTRAP_COOKIE, token, 600)
    return {"csrfToken": csrf_for(token)}


@router.post("/login")
async def login(
    data: LoginInput, request: Request, response: Response, db: AsyncSession = Depends(get_db)
):
    validate_unsafe_request(request)
    identity = normalize_email(data.email)
    await enforce_rate_limit("login", identity, request.state.context.client_address, 5, 900)
    result = await begin_login(db, identity, data.password, request.state.context)
    await db.commit()
    await refund_successful_attempt("login", identity, request.state.context.client_address)
    response.delete_cookie(SESSION_COOKIE, path="/")
    set_cookie(response, CHALLENGE_COOKIE, result.token, 300)
    return {"nextStep": result.next_step}


@router.post("/mfa/enroll")
async def enroll(request: Request, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get(CHALLENGE_COOKIE, "")
    validate_unsafe_request(request, token)
    uri = await begin_mfa_enrollment(db, token)
    await db.commit()
    return {"otpauthUri": uri}


@router.post("/mfa/verify")
async def verify(
    data: CodeInput, request: Request, response: Response, db: AsyncSession = Depends(get_db)
):
    token = request.cookies.get(CHALLENGE_COOKIE, "")
    validate_unsafe_request(request, token)
    await enforce_rate_limit("mfa", token, request.state.context.client_address, 5, 300)
    result = await complete_mfa(db, token, data.code.strip(), request.state.context)
    await db.commit()
    await refund_successful_attempt("mfa", token, request.state.context.client_address)
    response.delete_cookie(CHALLENGE_COOKIE, path="/")
    response.delete_cookie(BOOTSTRAP_COOKIE, path="/")
    set_cookie(response, SESSION_COOKIE, result.session.token, 8 * 3600)
    return {"nextStep": "authenticated", "recoveryCodes": result.recovery_codes}


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    validate_unsafe_request(request)
    principal = await authenticate_session(db, request.cookies.get(SESSION_COOKIE, ""))
    await revoke_session(db, principal, request.state.context)
    await db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CHALLENGE_COOKIE, path="/")
    return {"ok": True}


@router.post("/recovery/request")
async def recover(data: RecoveryInput, request: Request, db: AsyncSession = Depends(get_db)):
    validate_unsafe_request(request)
    identity = normalize_email(data.email)
    await enforce_rate_limit("recovery", identity, request.state.context.client_address, 3, 3600)
    await request_password_reset(db, identity, request.state.context)
    await db.commit()
    return {"message": "If an active account matches, a reset link will be sent."}


@router.post("/recovery/reset")
async def reset(
    data: ResetInput, request: Request, response: Response, db: AsyncSession = Depends(get_db)
):
    validate_unsafe_request(request)
    await enforce_rate_limit("reset", data.token, request.state.context.client_address, 5, 900)
    await reset_password(db, data.token, data.password, request.state.context)
    await db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CHALLENGE_COOKIE, path="/")
    return {"ok": True}
