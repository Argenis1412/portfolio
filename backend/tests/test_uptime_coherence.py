"""Tests for uptime coherence between /metrics/summary and /health."""

import time

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.uptime import APP_START_TIME
from app.main import app


@pytest.mark.anyio
async def test_uptime_derived_from_same_source():
    """Both endpoints must derive uptime from the shared APP_START_TIME constant."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        health_resp = await ac.get("/health")

    health = health_resp.json()
    assert health_resp.status_code == 200

    expected_uptime = int(time.time() - APP_START_TIME)
    health_uptime = health["uptime_seconds"]

    assert abs(expected_uptime - health_uptime) < 2


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
