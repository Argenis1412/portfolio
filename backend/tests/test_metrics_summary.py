"""
Tests for the warmup baseline reset in get_metrics_summary() (Failure A fix).

These exercise the endpoint function directly (not compute_p95/compute_request_stats
in isolation, which test_prometheus_aggregation.py already covers with injected
registries) because the warmup logic lives entirely in api.py and reads the
global prometheus REGISTRY.
"""

import time

import pytest
from fastapi import Response

from app.controllers import api as api_module
from app.controllers.chaos import ChaosIncident, chaos_state


@pytest.fixture(autouse=True)
def _reset_warmup_globals():
    """Isolate the one-shot warmup state and chaos flag across tests."""
    api_module._was_chaos_active = False
    api_module._baseline_established = False
    chaos_state.reset()
    yield
    api_module._was_chaos_active = False
    api_module._baseline_established = False
    chaos_state.reset()


def _patch_common(monkeypatch, *, total_samples, p95_seconds=0.5, app_start_offset_s):
    """Monkeypatch the prometheus/chaos calls used by get_metrics_summary."""
    calls = {"reset_p95_baseline": 0}

    def fake_compute_p95():
        # Simulate a real reset: after reset_p95_baseline() has been called,
        # the histogram is clean (0 samples) until new traffic accumulates.
        if calls["reset_p95_baseline"] > 0:
            return 0.0, 0
        return p95_seconds, total_samples

    def fake_compute_request_stats():
        return 42, 0

    def fake_reset_p95_baseline():
        calls["reset_p95_baseline"] += 1

    monkeypatch.setattr(api_module, "compute_p95", fake_compute_p95)
    monkeypatch.setattr(api_module, "compute_request_stats", fake_compute_request_stats)
    monkeypatch.setattr(api_module, "reset_p95_baseline", fake_reset_p95_baseline)
    monkeypatch.setattr(api_module, "APP_START_TIME", time.time() - app_start_offset_s)
    return calls


@pytest.mark.anyio
async def test_warmup_reset_fires_once_grace_expired_no_chaos(monkeypatch):
    """total_samples>=5, grace period (90s) expired, no chaos -> reset fires once."""
    calls = _patch_common(monkeypatch, total_samples=5, app_start_offset_s=100)

    result = await api_module.get_metrics_summary(Response())

    assert calls["reset_p95_baseline"] == 1
    assert api_module._baseline_established is True
    assert result.system_status in ("operational", "warming_up")


@pytest.mark.anyio
async def test_warmup_reset_does_not_fire_within_grace_period(monkeypatch):
    """total_samples>=5 but still within the 90s grace period -> no reset."""
    calls = _patch_common(monkeypatch, total_samples=5, app_start_offset_s=30)

    result = await api_module.get_metrics_summary(Response())

    assert calls["reset_p95_baseline"] == 0
    assert api_module._baseline_established is False
    assert result.p95_status == "warming_up"


@pytest.mark.anyio
async def test_warmup_reset_does_not_fire_during_active_chaos(monkeypatch):
    """recent_incident_active=True -> chaos owns recovery, warmup guard skipped."""
    calls = _patch_common(monkeypatch, total_samples=5, app_start_offset_s=100)
    chaos_state.record_incident(
        ChaosIncident(type="latency_injection", timestamp=time.time(), error_triggered=False)
    )

    result = await api_module.get_metrics_summary(Response())

    assert calls["reset_p95_baseline"] == 0
    assert result is not None


@pytest.mark.anyio
async def test_warmup_reset_is_one_shot(monkeypatch):
    """Calling the endpoint twice past grace period only resets once."""
    calls = _patch_common(monkeypatch, total_samples=5, app_start_offset_s=100)

    await api_module.get_metrics_summary(Response())
    await api_module.get_metrics_summary(Response())

    assert calls["reset_p95_baseline"] == 1
