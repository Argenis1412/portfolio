from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.controllers.chaos import chaos_state
from app.main import app


@pytest.mark.anyio
async def test_chaos_monkey_simulate_429():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"X-Debug-Mode": "simulate-429"}
        response = await ac.get("/api/v1/about", headers=headers)

        assert response.status_code == 429
        assert "Retry-After" in response.headers
        data = response.json()
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "Simulated rate limit exceeded" in data["error"]["message"]


@pytest.mark.anyio
async def test_chaos_monkey_simulate_500():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = {"X-Debug-Mode": "simulate-500"}
        response = await ac.get("/api/v1/about", headers=headers)

        assert response.status_code == 500
        data = response.json()
        assert data["error"]["code"] == "UNEXPECTED_ERROR"


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
        assert "requests_since_deploy" in data
        assert "error_rate" in data
        assert "error_rate_pct" in data
        assert "error_rate_status" in data
        assert "system_status" in data
        assert "uptime" in data
        assert "window" in data
        assert "timestamp" in data
        assert "%" in data["error_rate_pct"]
        assert data["window"] == "since_deploy"
        assert data["system_status"] in {"operational", "degraded", "warming_up"}
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
async def test_metrics_warming_up_suppresses_degraded():
    chaos_state.reset()
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.500, 5)),
        patch("app.controllers.api.compute_request_stats", return_value=(5, 0)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/metrics/summary")
            data = response.json()
            assert data["p95_status"] == "warming_up"
            assert data["error_rate_status"] == "warming_up"
            assert data["system_status"] == "operational"


@pytest.mark.anyio
async def test_metrics_exits_warming_up_at_threshold():
    chaos_state.reset()
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.500, 10)),
        patch("app.controllers.api.compute_request_stats", return_value=(10, 0)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/metrics/summary")
            data = response.json()
            assert data["p95_status"] == "degraded"


@pytest.mark.anyio
async def test_metrics_healthy_after_warming():
    chaos_state.reset()
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.030, 100)),
        patch("app.controllers.api.compute_request_stats", return_value=(100, 0)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/metrics/summary")
            data = response.json()
            assert data["p95_status"] == "healthy"
            assert data["system_status"] == "operational"


@pytest.mark.anyio
async def test_metrics_degraded_after_warming():
    chaos_state.reset()
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.500, 100)),
        patch("app.controllers.api.compute_request_stats", return_value=(100, 0)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/metrics/summary")
            data = response.json()
            assert data["p95_status"] == "degraded"
            assert data["system_status"] == "degraded"


@pytest.mark.anyio
async def test_system_status_operational_at_p95_between_50_and_100ms():
    """Regression: backend degraded threshold was 50ms, misaligned with frontend
    LATENCY_DEGRADED_MS=100ms. Production P95 naturally sits in 50-100ms range
    (Koyeb + remote DB) and was pinning the badge to DEGRADED. Threshold aligned
    to 100ms so this range now stays operational."""
    chaos_state.reset()
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.070, 100)),
        patch("app.controllers.api.compute_request_stats", return_value=(100, 0)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/metrics/summary")
            data = response.json()
            assert data["p95_ms"] == 70
            assert data["system_status"] == "operational"


@pytest.mark.anyio
async def test_system_status_degraded_at_p95_exact_100ms():
    """Boundary: p95 == 100ms must trigger degraded (threshold is >= 100)."""
    chaos_state.reset()
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.100, 100)),
        patch("app.controllers.api.compute_request_stats", return_value=(100, 0)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/metrics/summary")
            data = response.json()
            assert data["p95_ms"] == 100
            assert data["system_status"] == "degraded"


@pytest.mark.anyio
async def test_system_status_degraded_at_p95_above_100ms():
    """Regression: crossing the aligned 100ms boundary must still flip
    system_status to degraded."""
    chaos_state.reset()
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.120, 100)),
        patch("app.controllers.api.compute_request_stats", return_value=(100, 0)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/metrics/summary")
            data = response.json()
            assert data["p95_ms"] == 120
            assert data["system_status"] == "degraded"


@pytest.mark.anyio
async def test_chaos_reset_clears_prometheus_baseline():
    """Regression: POST /chaos/reset must also clear the Prometheus baseline so
    that a manual reset returns the badge to operational without a redeploy."""
    chaos_state.reset()
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.150, 100)),
        patch("app.controllers.api.compute_request_stats", return_value=(100, 0)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/metrics/summary")
            assert response.json()["system_status"] == "degraded"

            # After manual reset the badge must return to operational
            await ac.post("/api/v1/chaos/reset")

    # Now compute_p95 returns fresh low value (post-reset, no contamination)
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.070, 5)),
        patch("app.controllers.api.compute_request_stats", return_value=(5, 0)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/metrics/summary")
            data = response.json()
            # warming_up (5 < 10 samples after reset) → operational
            assert data["system_status"] == "operational"


@pytest.mark.anyio
async def test_error_response_includes_trace_id():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Request non-existent resource
        response = await ac.get("/api/v1/invalid-resource")

        assert response.status_code == 404
        data = response.json()
        assert "trace_id" in data["error"]
        assert isinstance(data["error"]["trace_id"], str)
