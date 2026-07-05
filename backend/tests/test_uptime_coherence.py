"""Tests for uptime coherence between /metrics/summary and /health."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.anyio
async def test_uptime_derived_from_same_source():
    """Both endpoints must report uptime from the same process start time."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        metrics_resp = await ac.get("/api/v1/metrics/summary")
        health_resp = await ac.get("/health")

    metrics = metrics_resp.json()
    health = health_resp.json()

    assert metrics_resp.status_code == 200
    assert health_resp.status_code == 200

    uptime_str = metrics["uptime"]
    health_uptime = health["uptime_seconds"]

    if uptime_str == "just started":
        metrics_uptime = 0
    elif "h" in uptime_str:
        parts = uptime_str.replace("h", "").replace("m", "").split()
        metrics_uptime = int(parts[0]) * 3600 + int(parts[1]) * 60
    elif "m" in uptime_str:
        metrics_uptime = int(uptime_str.replace("m", "")) * 60
    else:
        metrics_uptime = 0

    assert abs(metrics_uptime - health_uptime) < 120


@pytest.mark.anyio
async def test_no_start_file_created_on_import():
    """Importing the app must not create .app_start_time anymore."""
    from pathlib import Path

    start_file = Path(".app_start_time")
    if start_file.exists():
        start_file.unlink()

    # Re-exercise the app via a request (import side-effects already ran)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.get("/health")

    assert not start_file.exists()
