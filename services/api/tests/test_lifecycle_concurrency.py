import asyncio
import json

import pyotp
from sqlalchemy import select, text

from app.core.database import session_factory
from app.core.errors import DomainError
from app.core.request_context import RequestContext
from app.core.security import cipher
from app.modules.identity.mfa import begin_mfa_enrollment, complete_mfa
from app.modules.identity.models import MailOutbox, User
from app.modules.identity.recovery import request_password_reset, reset_password
from app.modules.identity.sessions import begin_login

context = RequestContext("concurrency-test", "127.0.0.1", "http://localhost:3000")


async def wait_until_transaction_is_blocked():
    for _ in range(100):
        async with session_factory() as db:
            waiting = await db.scalar(
                text(
                    "SELECT count(*) FROM pg_stat_activity "
                    "WHERE datname=current_database() AND wait_event_type='Lock'"
                )
            )
        if waiting:
            return
        await asyncio.sleep(0.01)
    raise AssertionError("Expected a competing PostgreSQL transaction to wait on the user lock")


async def reset_tokens(staff, count):
    async with session_factory.begin() as db:
        for _ in range(count):
            await request_password_reset(db, staff[0], context)
    async with session_factory() as db:
        rows = list(await db.scalars(select(MailOutbox).order_by(MailOutbox.created_at)))
        return [
            json.loads(cipher().decrypt(row.encrypted_payload.encode()))["url"].split("#token=")[1]
            for row in rows
        ]


async def test_overlapping_password_reset_and_mfa_do_not_deadlock(staff):
    async with session_factory.begin() as db:
        challenge = await begin_login(db, *staff, context)
        uri = await begin_mfa_enrollment(db, challenge.token)
    token = (await reset_tokens(staff, 1))[0]

    async def competing_mfa():
        try:
            async with session_factory.begin() as db:
                await complete_mfa(db, challenge.token, pyotp.parse_uri(uri).now(), context)
            return "authenticated"
        except DomainError as error:
            return error.code

    async with session_factory.begin() as resetting:
        await resetting.scalar(select(User).where(User.email == staff[0]).with_for_update())
        task = asyncio.create_task(competing_mfa())
        await wait_until_transaction_is_blocked()
        await asyncio.wait_for(
            reset_password(resetting, token, "replacement-password-with-length", context), timeout=3
        )
    assert await asyncio.wait_for(task, timeout=3) == "SESSION_EXPIRED"


async def test_two_reset_links_are_serialized_before_token_locks(staff):
    first, second = await reset_tokens(staff, 2)

    async def competing_reset():
        try:
            async with session_factory.begin() as db:
                await reset_password(db, second, "second-replacement-password", context)
            return "reset"
        except DomainError as error:
            return error.code

    async with session_factory.begin() as resetting:
        await resetting.scalar(select(User).where(User.email == staff[0]).with_for_update())
        task = asyncio.create_task(competing_reset())
        await wait_until_transaction_is_blocked()
        await asyncio.wait_for(
            reset_password(resetting, first, "first-replacement-password", context), timeout=3
        )
    assert await asyncio.wait_for(task, timeout=3) == "INVALID_RESET"
