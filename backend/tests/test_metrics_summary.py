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


@pytest.fixture(autouse=True)
def _reset_warmup_globals():
    """Isolate the one-shot warmup state across tests."""
    api_module._baseline_established = False
    yield
    api_module._baseline_established = False


def _patch_common(monkeypatch, *, total_samples, p95_seconds=0.5, app_start_offset_s):
    """Monkeypatch the Prometheus calls used by get_metrics_summary."""
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
async def test_warmup_reset_fires_once_grace_expired(monkeypatch):
    """total_samples>=5, grace period (90s) expired -> reset fires once."""
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
async def test_warmup_reset_is_one_shot(monkeypatch):
    """Calling the endpoint twice past grace period only resets once."""
    calls = _patch_common(monkeypatch, total_samples=5, app_start_offset_s=100)

    await api_module.get_metrics_summary(Response())
    await api_module.get_metrics_summary(Response())

    assert calls["reset_p95_baseline"] == 1


@pytest.mark.anyio
async def test_warmup_waits_for_enough_samples(monkeypatch):
    calls = _patch_common(monkeypatch, total_samples=4, app_start_offset_s=100)

    result = await api_module.get_metrics_summary(Response())

    assert calls["reset_p95_baseline"] == 0
    assert result.p95_status == "warming_up"


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("requests", "errors", "rate", "status"),
    [(0, 0, 0.0, "stable"), (100, 5, 0.05, "stable"), (100, 6, 0.06, "warning")],
)
async def test_summary_uses_observed_request_and_error_counts(
    monkeypatch, requests, errors, rate, status
):
    _patch_common(
        monkeypatch, total_samples=100, p95_seconds=0.03, app_start_offset_s=100
    )
    monkeypatch.setattr(api_module, "_baseline_established", True)
    monkeypatch.setattr(api_module, "compute_request_stats", lambda: (requests, errors))

    result = await api_module.get_metrics_summary(Response())

    assert result.requests_since_deploy == requests
    assert result.error_rate == rate
    assert result.error_rate_status == status
    assert result.system_status == ("degraded" if rate > 0.05 else "operational")
