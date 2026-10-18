from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from redis.exceptions import ConnectionError as RedisConnectionError
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.adapters import rate_limit
from app.core.config import get_settings
from app.core.database import session_factory
from app.core.errors import DomainError
from app.core.request_context import RequestContext
from app.main import create_app
from app.modules.audit.models import AuditEvent
from app.modules.audit.service import append_event
from app.modules.identity.models import User
from app.modules.identity.provision import provision_staff
from app.modules.identity.schemas import Principal
from app.modules.organizations.models import Branch, Membership, Organization
from app.modules.organizations.permissions import require_permission
from app.modules.organizations.service import get_workspace

context = RequestContext("security-test", "127.0.0.1", "http://localhost:3000")


async def test_successful_attempts_do_not_exhaust_failure_budget():
    for _ in range(8):
        await rate_limit.enforce_rate_limit("login", "user", "client", 5, 900)
        await rate_limit.refund_successful_attempt("login", "user", "client")
    for _ in range(5):
        await rate_limit.enforce_rate_limit("login", "user", "client", 5, 900)
    with pytest.raises(DomainError) as failure:
        await rate_limit.enforce_rate_limit("login", "user", "client", 5, 900)
    assert failure.value.code == "RATE_LIMITED"


async def test_redis_outage_fails_closed(monkeypatch):
    async def unavailable(*args, **kwargs):
        raise RedisConnectionError("offline")

    monkeypatch.setattr(rate_limit.redis, "eval", unavailable)
    with pytest.raises(DomainError) as failure:
        await rate_limit.enforce_rate_limit("login", "user", "client", 5, 900)
    assert failure.value.code == "UNAVAILABLE"
    assert failure.value.status == 503


async def test_throttle_ignores_spoofed_forwarded_addresses(staff):
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://api"
    ) as client:
        csrf = (await client.get("/auth/csrf", headers={"origin": context.origin})).json()[
            "csrfToken"
        ]
        responses = []
        for index in range(6):
            response = await client.post(
                "/auth/login",
                headers={
                    "origin": context.origin,
                    "x-csrf-token": csrf,
                    "x-forwarded-for": f"192.0.2.{index}",
                },
                json={"email": staff[0], "password": "incorrect-password"},
            )
            responses.append(response.status_code)
        assert responses == [401, 401, 401, 401, 401, 429]
        assert response.headers["retry-after"]


async def test_receptionist_and_admin_have_no_clinical_bypass(staff):
    for role in ("receptionist", "clinic_administrator", "platform_administrator"):
        email = f"{role}@example.org"
        await provision_staff(
            email, "Synthetic staff", role, "Main", role, "a-long-unique-test-passphrase"
        )
        async with session_factory.begin() as db:
            user = await db.scalar(select(User).where(User.email == email))
            organization = await db.scalar(select(Organization).where(Organization.name == role))
            principal = Principal(user.id, uuid4())
            with pytest.raises(DomainError):
                await require_permission(db, principal, organization.id, "clinical.read")


async def test_branch_scope_and_cross_tenant_foreign_key(staff):
    async with session_factory.begin() as db:
        user = await db.scalar(select(User).where(User.email == staff[0]))
        membership = await db.scalar(select(Membership).where(Membership.user_id == user.id))
        extra = Branch(organization_id=membership.organization_id, name="Not assigned")
        db.add(extra)
        await db.flush()
        _, branches = await get_workspace(
            db, Principal(user.id, uuid4()), membership.organization_id
        )
        assert membership.branch_id in {branch.id for branch in branches}
        assert extra.id not in {branch.id for branch in branches}
        other = Organization(name="Foreign synthetic clinic")
        db.add(other)
        await db.flush()
        other_branch = Branch(organization_id=other.id, name="Foreign branch")
        db.add(other_branch)
        await db.flush()
        other_id = other_branch.id
    with pytest.raises(IntegrityError):
        async with session_factory.begin() as db:
            await db.execute(update(Membership).values(branch_id=other_id))


async def test_audit_is_append_only_and_rolls_back_with_write(staff):
    async with session_factory.begin() as db:
        await append_event(db, None, context, "test.allowed")
        event_id = await db.scalar(select(AuditEvent.id).where(AuditEvent.action == "test.allowed"))
    with pytest.raises(Exception, match="append-only"):
        async with session_factory.begin() as db:
            await db.execute(
                update(AuditEvent).where(AuditEvent.id == event_id).values(action="changed")
            )
    try:
        async with session_factory.begin() as db:
            db.add(Organization(name="Rolled back clinic"))
            await append_event(db, None, context, "test.rolled_back")
            raise RuntimeError("Rollback")
    except RuntimeError:
        pass
    async with session_factory() as db:
        assert (
            await db.scalar(select(Organization).where(Organization.name == "Rolled back clinic"))
            is None
        )
        assert (
            await db.scalar(select(AuditEvent).where(AuditEvent.action == "test.rolled_back"))
            is None
        )


async def test_provisioning_reuses_identity_without_changing_password(staff):
    async with session_factory() as db:
        before = await db.scalar(select(User.password_hash).where(User.email == staff[0]))
    await provision_staff(
        staff[0].upper(), "Existing staff", "Additional clinic", "Main", "dentist", None
    )
    async with session_factory() as db:
        users = list(await db.scalars(select(User).where(User.email == staff[0])))
        assert len(users) == 1
        assert users[0].password_hash == before


def test_production_rejects_insecure_cookie_configuration():
    settings = get_settings()
    with pytest.raises(ValueError):
        type(settings)(**{**settings.model_dump(), "app_env": "production", "cookie_secure": False})
