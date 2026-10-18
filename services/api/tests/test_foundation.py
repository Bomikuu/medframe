import asyncio
import json
from datetime import timedelta
from uuid import uuid4

import pyotp
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, update

from app.adapters.rate_limit import enforce_rate_limit
from app.core.database import session_factory, utcnow
from app.core.errors import DomainError
from app.core.request_context import RequestContext
from app.core.security import cipher
from app.graphql.limits import validate_query
from app.main import create_app
from app.modules.identity.mfa import begin_mfa_enrollment, complete_mfa
from app.modules.identity.models import MailOutbox, MfaCredential, Session
from app.modules.identity.passwords import hash_password, verify_password
from app.modules.identity.provision import provision_staff
from app.modules.identity.recovery import request_password_reset, reset_password
from app.modules.identity.sessions import authenticate_session, begin_login
from app.modules.organizations.models import Membership, Organization
from app.modules.organizations.permissions import require_permission
from app.modules.organizations.service import get_workspace, list_my_organizations

context = RequestContext("test-request", "127.0.0.1", "http://localhost:3000")


async def login_challenge(staff):
    async with session_factory.begin() as db:
        challenge = await begin_login(db, *staff, context)
    return challenge


async def enroll(staff):
    challenge = await login_challenge(staff)
    async with session_factory.begin() as db:
        uri = await begin_mfa_enrollment(db, challenge.token)
    async with session_factory.begin() as db:
        completion = await complete_mfa(db, challenge.token, pyotp.parse_uri(uri).now(), context)
    return completion


def test_password_preserves_unicode_and_whitespace():
    password = "  préserver-🔑-password  "
    hashed = hash_password(password)
    assert verify_password(password, hashed)
    assert not verify_password(password.strip(), hashed)
    assert not verify_password("a" * 129, hashed)


async def test_challenge_cannot_open_workspace(staff):
    challenge = await login_challenge(staff)
    async with session_factory.begin() as db:
        with pytest.raises(DomainError, match="expired"):
            await authenticate_session(db, challenge.token)
        assert await db.scalar(select(MfaCredential)) is None


async def test_enrollment_requires_totp_and_rotates_cookie(staff):
    result = await enroll(staff)
    assert len(result.recovery_codes) == 10
    async with session_factory.begin() as db:
        principal = await authenticate_session(db, result.session.token)
        organizations = await list_my_organizations(db, principal)
        assert len(organizations) == 1
        organization, branches = await get_workspace(db, principal, organizations[0].id)
        assert organization.name == "Synthetic Dental Clinic"
        assert len(branches) == 1
        assert await db.scalar(select(MfaCredential.confirmed)) is True
        sessions = list(await db.scalars(select(Session)))
        assert all(record.token_hash != result.session.token for record in sessions)


async def test_recovery_code_race_allows_one_success(staff):
    result = await enroll(staff)
    first = await login_challenge(staff)
    second = await login_challenge(staff)

    async def verify(token):
        try:
            async with session_factory.begin() as db:
                await complete_mfa(db, token, result.recovery_codes[0], context)
            return True
        except DomainError:
            return False

    outcomes = await asyncio.gather(verify(first.token), verify(second.token))
    assert sorted(outcomes) == [False, True]


async def test_totp_replay_race_allows_one_success(staff):
    await enroll(staff)
    async with session_factory.begin() as db:
        credential = await db.scalar(select(MfaCredential))
        credential.last_step -= 1
        secret = cipher().decrypt(credential.encrypted_secret.encode()).decode()
    challenges = [await login_challenge(staff), await login_challenge(staff)]

    async def verify(token):
        try:
            async with session_factory.begin() as db:
                await complete_mfa(db, token, pyotp.TOTP(secret).now(), context)
            return True
        except DomainError:
            return False

    assert sorted(await asyncio.gather(*(verify(c.token) for c in challenges))) == [False, True]


async def test_membership_revocation_and_cross_tenant_denied(staff):
    result = await enroll(staff)
    await provision_staff(
        "other@example.org",
        "Dr. Mateo Santos",
        "Other synthetic clinic",
        "Main",
        "dentist",
        "a-unique-long-test-password",
    )
    async with session_factory.begin() as db:
        principal = await authenticate_session(db, result.session.token)
        organizations = await list_my_organizations(db, principal)
        other = await db.scalar(
            select(Organization).where(Organization.name == "Other synthetic clinic")
        )
        for target in (other.id, uuid4()):
            with pytest.raises(DomainError) as error:
                await require_permission(db, principal, target, "workspace.read")
            assert error.value.code == "FORBIDDEN"
        await db.execute(
            update(Membership).where(Membership.user_id == principal.user_id).values(active=False)
        )
    async with session_factory.begin() as db:
        with pytest.raises(DomainError):
            await get_workspace(db, principal, organizations[0].id)


async def test_expired_and_revoked_sessions_fail(staff):
    result = await enroll(staff)
    async with session_factory.begin() as db:
        with pytest.raises(DomainError):
            await authenticate_session(db, result.session.token, utcnow() + timedelta(minutes=31))
        await db.execute(update(Session).values(revoked=True))
    async with session_factory.begin() as db:
        with pytest.raises(DomainError):
            await authenticate_session(db, result.session.token)


async def test_password_reset_revokes_sessions_and_preserves_mfa(staff):
    result = await enroll(staff)
    async with session_factory.begin() as db:
        await request_password_reset(db, staff[0], context)
    async with session_factory() as db:
        outbox = await db.scalar(select(MailOutbox))
        payload = json.loads(cipher().decrypt(outbox.encrypted_payload.encode()))
        token = payload["url"].split("#token=")[1]
        assert token not in outbox.encrypted_payload
    async with session_factory.begin() as db:
        await reset_password(db, token, "replacement-password-with-length", context)
    async with session_factory.begin() as db:
        with pytest.raises(DomainError):
            await authenticate_session(db, result.session.token)
        with pytest.raises(DomainError):
            await reset_password(db, token, "replacement-password-with-length", context)
        assert (await db.scalar(select(MfaCredential))).confirmed


async def test_rate_limits_share_identity_and_client_counters():
    for _ in range(5):
        await enforce_rate_limit("test", "same-user", "same-client", 5, 900)
    with pytest.raises(DomainError) as error:
        await enforce_rate_limit("test", "other-user", "same-client", 5, 900)
    assert error.value.code == "RATE_LIMITED"


@pytest.mark.parametrize(
    "query",
    [
        "query { " + " ".join(f"a{i}: currentUser {{ id }}" for i in range(101)) + " }",
        "query { ...A } fragment A on Query { ...A }",
        "mutation { currentUser { id } }",
    ],
)
def test_graphql_rejects_cost_cycles_and_mutations(query):
    with pytest.raises(DomainError):
        validate_query(query)


async def test_http_blocks_origin_csrf_and_secret_validation_echo(staff):
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://api"
    ) as client:
        response = await client.post("/auth/login", json={"email": staff[0], "password": staff[1]})
        assert response.status_code == 403
        response = await client.post(
            "/auth/login",
            headers={"origin": context.origin},
            json={"email": staff[0], "password": staff[1]},
        )
        assert response.status_code == 403
        assert staff[1] not in response.text
        csrf = (await client.get("/auth/csrf", headers={"origin": context.origin})).json()[
            "csrfToken"
        ]
        response = await client.post(
            "/auth/login",
            headers={"origin": context.origin, "x-csrf-token": csrf},
            json={"email": staff[0], "password": "x" * 129},
        )
        assert response.status_code == 422
        assert "x" * 129 not in response.text
        assert response.headers["cache-control"] == "no-store"


async def test_http_complete_mfa_graphql_logout_journey(staff):
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://api"
    ) as client:

        async def post(path, body):
            csrf = (await client.get("/auth/csrf", headers={"origin": context.origin})).json()[
                "csrfToken"
            ]
            return await client.post(
                path, json=body, headers={"origin": context.origin, "x-csrf-token": csrf}
            )

        assert (await post("/auth/login", {"email": staff[0], "password": staff[1]})).json()[
            "nextStep"
        ] == "enroll"
        assert (await post("/graphql", {"query": "{ currentUser { id } }"})).status_code == 401
        uri = (await post("/auth/mfa/enroll", {})).json()["otpauthUri"]
        response = await post("/auth/mfa/verify", {"code": pyotp.parse_uri(uri).now()})
        assert len(response.json()["recoveryCodes"]) == 10
        assert "HttpOnly" in response.headers["set-cookie"]
        response = await post(
            "/graphql", {"query": "{ currentUser { displayName } myOrganizations { id name } }"}
        )
        assert response.json()["data"]["currentUser"]["displayName"] == "Dr. Althea Reyes"
        assert (await post("/auth/logout", {})).status_code == 200
        assert (await post("/graphql", {"query": "{ currentUser { id } }"})).status_code == 401
