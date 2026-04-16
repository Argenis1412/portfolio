import pytest
from httpx import AsyncClient, ASGITransport
from app.principal import app
from app.controladores.chaos import chaos_state


@pytest.mark.anyio
async def test_chaos_monkey_simulate_429():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"X-Debug-Mode": "simulate-429"}
        response = await ac.get("/api/v1/sobre", headers=headers)

        assert response.status_code == 429
        assert "Retry-After" in response.headers
        data = response.json()
        assert data["erro"]["codigo"] == "RATE_LIMIT_EXCEEDED"
        assert "Simulated rate limit exceeded" in data["erro"]["mensagem"]


@pytest.mark.anyio
async def test_chaos_monkey_simulate_500():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"X-Debug-Mode": "simulate-500"}
        response = await ac.get("/api/v1/sobre", headers=headers)

        assert response.status_code == 500
        data = response.json()
        assert data["erro"]["codigo"] == "ERRO_INESPERADO"


@pytest.mark.anyio
async def test_metrics_summary():
    # Reset chaos state to isolate from other tests
    chaos_state.reset()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/metrics/summary")

        assert response.status_code == 200
        data = response.json()
        assert "p95_ms" in data
        assert "p95_status" in data
        assert "requests_24h" in data
        assert "error_rate" in data
        assert "error_rate_pct" in data
        assert "error_rate_status" in data
        assert "system_status" in data
        assert "uptime" in data
        assert "window" in data
        assert "timestamp" in data
        assert "%" in data["error_rate_pct"]
        assert data["window"] == "last_24h"
        assert data["system_status"] == "operational"
        # Chaos-related fields
        assert "retries_1h" in data
        assert "last_incident" in data
        assert "last_incident_ago" in data
        assert data["last_incident"] == "none"
        assert data["retries_1h"] == 0


@pytest.mark.anyio
async def test_chaos_spike():
    chaos_state.reset()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/chaos/spike")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "requests_sent" in data
        assert "elapsed_ms" in data
        assert data["incident_type"] == "traffic_spike"


@pytest.mark.anyio
async def test_chaos_failure():
    chaos_state.reset()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/chaos/failure")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "recovered"
        assert "recovery_ms" in data
        assert data["incident_type"] == "forced_failure"
        assert data["error_triggered"] is True


@pytest.mark.anyio
async def test_metrics_reflect_chaos_incident():
    """After a chaos action, /metrics/summary should reflect the incident."""
    chaos_state.reset()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Trigger a failure first
        await ac.post("/api/v1/chaos/failure")

        # Now check metrics
        response = await ac.get("/api/v1/metrics/summary")
        data = response.json()
        assert data["last_incident"] == "forced_failure"
        assert data["retries_1h"] >= 1


@pytest.mark.anyio
async def test_retries_accumulate_across_chaos_actions():
    """Retries should accumulate realistically across multiple chaos triggers."""
    chaos_state.reset()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Trigger spike (generates ~6+ retries)
        await ac.post("/api/v1/chaos/spike")
        # Trigger failure (generates 3 retries)
        await ac.post("/api/v1/chaos/failure")

        response = await ac.get("/api/v1/metrics/summary")
        data = response.json()
        # Should have at minimum 9 retries (6 from spike + 3 from failure)
        assert data["retries_1h"] >= 9


@pytest.mark.anyio
async def test_error_response_includes_trace_id():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Request non-existent resource
        response = await ac.get("/api/v1/invalid-resource")

        assert response.status_code == 404
        data = response.json()
        assert "trace_id" in data["erro"]
        assert isinstance(data["erro"]["trace_id"], str)
