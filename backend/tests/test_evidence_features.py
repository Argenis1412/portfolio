import time
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

import app.controllers.api as api_module
from app.main import app


@pytest.fixture(autouse=True)
def _bypass_warmup_reset(monkeypatch):
    """These tests exercise p95-threshold logic, not the
    warmup baseline reset (covered separately in test_metrics_summary.py).
    Without this, a fresh test-process APP_START_TIME (<90s old) would make
    every request look like it's within the warmup grace window."""
    monkeypatch.setattr(api_module, "_baseline_established", True)
    monkeypatch.setattr(api_module, "APP_START_TIME", time.time() - 1000)


@pytest.mark.anyio
async def test_metrics_summary():

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
        assert set(data) == {
            "p95_ms",
            "p95_status",
            "requests_since_deploy",
            "error_rate",
            "error_rate_pct",
            "error_rate_status",
            "system_status",
            "uptime",
            "window",
            "timestamp",
        }


@pytest.mark.anyio
async def test_metrics_warming_up_suppresses_degraded():
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.500, 4)),
        patch("app.controllers.api.compute_request_stats", return_value=(4, 0)),
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
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.500, 5)),
        patch("app.controllers.api.compute_request_stats", return_value=(5, 0)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/metrics/summary")
            data = response.json()
            assert data["p95_status"] == "degraded"


@pytest.mark.anyio
async def test_metrics_healthy_after_warming():
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
            assert data["p95_status"] == "healthy"


@pytest.mark.anyio
async def test_p95_status_degraded_at_exact_100ms():
    """Boundary: p95_status uses the same 100ms cutoff as system_status."""
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.100, 100)),
        patch("app.controllers.api.compute_request_stats", return_value=(100, 0)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/metrics/summary")
            data = response.json()
            assert data["p95_ms"] == 100
            assert data["p95_status"] == "degraded"


@pytest.mark.anyio
async def test_p95_status_stays_warming_up_despite_high_latency_with_few_samples():
    """warming_up is evaluated independently of p95_ms — a cold-start with high
    latency and too few samples must not skip straight to degraded."""
    with (
        patch("app.controllers.api.compute_p95", return_value=(0.150, 4)),
        patch("app.controllers.api.compute_request_stats", return_value=(4, 0)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/metrics/summary")
            data = response.json()
            assert data["p95_status"] == "warming_up"


@pytest.mark.anyio
async def test_system_status_degraded_at_p95_exact_100ms():
    """Boundary: p95 == 100ms must trigger degraded (threshold is >= 100)."""
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
async def test_error_response_includes_trace_id():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Request non-existent resource
        response = await ac.get("/api/v1/invalid-resource")

        assert response.status_code == 404
        data = response.json()
        assert "trace_id" in data["error"]
        assert isinstance(data["error"]["trace_id"], str)
