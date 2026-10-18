from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from test_foundation import enroll
from test_patients_workflow import context

from app.core.database import session_factory
from app.core.errors import DomainError
from app.graphql.limits import validate_query
from app.graphql.schema import schema
from app.main import create_app
from app.modules.identity.schemas import Principal
from app.modules.organizations.models import Membership


@pytest.mark.parametrize(
    "document",
    [
        "mutation { a: registerPatient { id } b: registerPatient { id } }",
        "mutation { ...M } fragment M on PatientMutation { "
        "a: registerPatient { id } b: registerPatient { id } }",
        "subscription { currentUser { id } }",
        "query A { currentUser { id } } query B { currentUser { id } }",
    ],
)
def test_single_mutation_root_is_enforced(document):
    with pytest.raises(DomainError):
        validate_query(document)


def test_one_mutation_passes_existing_bounds():
    validate_query('mutation { registerPatient(organizationId:"x",data:{fullName:"x"}) { id } }')


async def test_real_authenticated_mutation_and_safe_errors(staff, caplog):
    completion = await enroll(staff)
    async with session_factory() as db:
        member = await db.scalar(select(Membership))
        organization_id = str(member.organization_id)
        branch_id = str(member.branch_id)
    async with AsyncClient(
        transport=ASGITransport(app=create_app()),
        base_url="http://api",
        cookies={"medframe_session": completion.session.token},
    ) as client:

        async def request(query, variables):
            csrf = (await client.get("/auth/csrf", headers={"origin": context.origin})).json()[
                "csrfToken"
            ]
            return await client.post(
                "/graphql",
                json={"query": query, "variables": variables},
                headers={"origin": context.origin, "x-csrf-token": csrf},
            )

        mutation = (
            "mutation($org: UUID!, $data: RegisterPatientInput!) { "
            "registerPatient(organizationId:$org,data:$data) { id fullName dateOfBirth } }"
        )
        data = {
            "branchId": branch_id,
            "requestId": str(uuid4()),
            "fullName": "SYNTHETIC_PRIVATE_NAME",
            "dateOfBirth": "2001-02-03",
        }
        response = await request(mutation, {"org": organization_id, "data": data})
        assert response.json()["data"]["registerPatient"]["fullName"] == data["fullName"]
        assert response.json()["data"]["registerPatient"]["dateOfBirth"] == "2001-02-03"
        data["fullName"] = "SYNTHETIC_INVALID_NAME" * 30
        response = await request(mutation, {"org": organization_id, "data": data})
        assert response.json()["errors"][0]["extensions"]["code"] == "INVALID_INPUT"
        assert "SYNTHETIC_" not in response.text
        assert "SYNTHETIC_" not in caplog.text
        assert (
            await client.post(
                "/graphql", json={"query": mutation}, headers={"origin": context.origin}
            )
        ).status_code == 403


async def test_schema_error_reporter_does_not_log_inputs(staff, caplog, monkeypatch):
    from app.modules.patients import registration

    async def unavailable(*args, **kwargs):
        raise RuntimeError("SYNTHETIC_SENSITIVE_VALUE")

    monkeypatch.setattr(registration, "register_patient", unavailable)
    async with session_factory() as db:
        member = await db.scalar(select(Membership))
    result = await schema.execute(
        "mutation($org:UUID!,$data:RegisterPatientInput!){registerPatient(organizationId:$org,data:$data){id}}",
        variable_values={
            "org": str(member.organization_id),
            "data": {
                "branchId": str(member.branch_id),
                "requestId": str(uuid4()),
                "fullName": "SYNTHETIC_SENSITIVE_VALUE",
            },
        },
        context_value={"principal": Principal(member.user_id, uuid4()), "request_context": context},
    )
    assert result.errors
    assert "SYNTHETIC_SENSITIVE_VALUE" not in caplog.text
