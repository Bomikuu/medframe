import pytest
from httpx import ASGITransport, AsyncClient

from app.adapters.rate_limit import redis
from app.main import create_app


@pytest.mark.asyncio
async def test_health_reports_readiness_without_connection_details():
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://api"
    ) as client:
        response = await client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}
    assert "postgres" not in response.text


async def test_readiness_fails_without_redis_and_hides_connection_details(monkeypatch):
    async def unavailable():
        raise ConnectionError("private connection detail")

    monkeypatch.setattr(redis, "ping", unavailable)
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://api"
    ) as client:
        response = await client.get("/health/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
    assert "private connection detail" not in response.text
