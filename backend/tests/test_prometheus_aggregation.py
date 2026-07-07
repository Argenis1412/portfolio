"""Tests for prometheus_aggregation module."""

import pytest
from prometheus_client import CollectorRegistry, Counter, Histogram

from app.core.prometheus_aggregation import (
    compute_p95,
    compute_request_stats,
    reset_metrics_baseline,
)


@pytest.fixture(autouse=False)
def clear_baseline():
    """Isolate global _baseline state for baseline-related tests."""
    reset_metrics_baseline(registry=CollectorRegistry())
    yield
    reset_metrics_baseline(registry=CollectorRegistry())


def _make_registry_with_latency(
    observations: list[float],
    handler: str = "/api/v1/projects",
) -> CollectorRegistry:
    registry = CollectorRegistry()
    h = Histogram(
        "http_request_duration_seconds",
        "Request duration",
        labelnames=["handler"],
        buckets=(0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1.0, 2.5, 5.0, 10.0),
        registry=registry,
    )
    for obs in observations:
        h.labels(handler=handler).observe(obs)
    return registry


def test_p95_accuracy():
    observations = [0.020] * 95 + [0.200] * 5
    registry = _make_registry_with_latency(observations)
    p95, total = compute_p95(registry=registry)
    assert total == 100
    assert 0.015 <= p95 <= 0.060


def test_p95_warming_up_threshold():
    registry = _make_registry_with_latency([0.010] * 5)
    _, total = compute_p95(registry=registry)
    assert total == 5


def test_p95_excludes_self_polling():
    registry = CollectorRegistry()
    h = Histogram(
        "http_request_duration_seconds",
        "Request duration",
        labelnames=["handler"],
        buckets=(0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1.0, 2.5, 5.0, 10.0),
        registry=registry,
    )
    for _ in range(50):
        h.labels(handler="/api/v1/projects").observe(0.020)
    for _ in range(200):
        h.labels(handler="/api/v1/metrics/summary").observe(5.0)

    p95, total = compute_p95(registry=registry)
    assert total == 50
    assert p95 < 0.1


def test_request_stats_counts_correctly():
    registry = CollectorRegistry()
    c = Counter(
        "http_requests_total",
        "Total requests",
        labelnames=["handler", "status"],
        registry=registry,
    )
    c.labels(handler="/api/v1/projects", status="2xx").inc(900)
    c.labels(handler="/api/v1/projects", status="5xx").inc(10)
    c.labels(handler="/api/v1/about", status="2xx").inc(50)

    total, errors = compute_request_stats(registry=registry)
    assert total == 960
    assert errors == 10


def test_request_stats_excludes_self_polling():
    registry = CollectorRegistry()
    c = Counter(
        "http_requests_total",
        "Total requests",
        labelnames=["handler", "status"],
        registry=registry,
    )
    c.labels(handler="/api/v1/projects", status="2xx").inc(100)
    c.labels(handler="/api/v1/metrics/summary", status="2xx").inc(5000)
    c.labels(handler="/metrics", status="2xx").inc(3000)

    total, errors = compute_request_stats(registry=registry)
    assert total == 100
    assert errors == 0


def test_p95_excludes_health_endpoints():
    registry = CollectorRegistry()
    h = Histogram(
        "http_request_duration_seconds",
        "Request duration",
        labelnames=["handler"],
        buckets=(0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1.0, 2.5, 5.0, 10.0),
        registry=registry,
    )
    for _ in range(50):
        h.labels(handler="/api/v1/projects").observe(0.020)
    for _ in range(500):
        h.labels(handler="/health").observe(0.130)
    for _ in range(500):
        h.labels(handler="/live").observe(0.005)

    p95, total = compute_p95(registry=registry)
    assert total == 50
    assert p95 < 0.1


def test_request_stats_excludes_health_endpoints():
    registry = CollectorRegistry()
    c = Counter(
        "http_requests_total",
        "Total requests",
        labelnames=["handler", "status"],
        registry=registry,
    )
    c.labels(handler="/api/v1/projects", status="2xx").inc(100)
    c.labels(handler="/health", status="2xx").inc(5000)
    c.labels(handler="/live", status="2xx").inc(3000)
    c.labels(handler="/saude", status="2xx").inc(200)
    c.labels(handler="/salud", status="2xx").inc(200)

    total, errors = compute_request_stats(registry=registry)
    assert total == 100
    assert errors == 0


def test_compute_p95_excludes_chaos_endpoints():
    registry = CollectorRegistry()
    h = Histogram(
        "http_request_duration_seconds",
        "Request duration",
        labelnames=["handler"],
        buckets=(0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1.0, 2.5, 5.0, 10.0),
        registry=registry,
    )
    for _ in range(10):
        h.labels(handler="/api/v1/projects").observe(0.020)
    h.labels(handler="/api/v1/chaos/latency").observe(3.000)

    p95, total = compute_p95(registry=registry)
    assert total == 10
    assert p95 < 0.1


def test_compute_p95_all_chaos_returns_empty():
    registry = CollectorRegistry()
    h = Histogram(
        "http_request_duration_seconds",
        "Request duration",
        labelnames=["handler"],
        buckets=(0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1.0, 2.5, 5.0, 10.0),
        registry=registry,
    )
    for _ in range(5):
        h.labels(handler="/api/v1/chaos/latency").observe(3.000)
    h.labels(handler="/api/v1/chaos/failure").observe(0.020)
    h.labels(handler="/api/v1/chaos/drain").observe(0.050)

    p95, total = compute_p95(registry=registry)
    assert p95 == 0.0
    assert total == 0


def test_compute_request_stats_excludes_chaos_endpoints():
    registry = CollectorRegistry()
    c = Counter(
        "http_requests_total",
        "Total requests",
        labelnames=["handler", "status"],
        registry=registry,
    )
    c.labels(handler="/api/v1/projects", status="2xx").inc(500)
    c.labels(handler="/api/v1/projects", status="5xx").inc(3)
    c.labels(handler="/api/v1/chaos/failure", status="5xx").inc(20)
    c.labels(handler="/api/v1/chaos/latency", status="2xx").inc(10)

    total, errors = compute_request_stats(registry=registry)
    assert total == 503
    assert errors == 3


def test_p95_empty_registry():
    registry = CollectorRegistry()
    p95, total = compute_p95(registry=registry)
    assert p95 == 0.0
    assert total == 0


def test_request_stats_empty_registry():
    registry = CollectorRegistry()
    total, errors = compute_request_stats(registry=registry)
    assert total == 0
    assert errors == 0


# ── Baseline reset tests ───────────────────────────────────────────────────


def test_reset_baseline_zeroes_prior_p95_observations(clear_baseline):
    """Regression: chaos-period slow samples must not persist into post-chaos P95.
    After reset_metrics_baseline(), compute_p95 returns (0.0, 0) for the same
    registry — all pre-reset observations are treated as baseline, not new data."""
    registry = CollectorRegistry()
    h = Histogram(
        "http_request_duration_seconds",
        "Request duration",
        labelnames=["handler"],
        buckets=(0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1.0, 2.5, 5.0, 10.0),
        registry=registry,
    )
    for _ in range(20):
        h.labels(handler="/api/v1/about").observe(0.150)  # contaminated

    reset_metrics_baseline(registry=registry)

    p95, total = compute_p95(registry=registry)
    assert total == 0
    assert p95 == 0.0


def test_reset_baseline_only_counts_incremental_p95(clear_baseline):
    """After a baseline snapshot, compute_p95 reflects only post-reset observations."""
    registry = CollectorRegistry()
    h = Histogram(
        "http_request_duration_seconds",
        "Request duration",
        labelnames=["handler"],
        buckets=(0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1.0, 2.5, 5.0, 10.0),
        registry=registry,
    )
    for _ in range(10):
        h.labels(handler="/api/v1/about").observe(0.150)  # pre-reset contamination

    reset_metrics_baseline(registry=registry)

    for _ in range(20):
        h.labels(handler="/api/v1/about").observe(0.040)  # post-reset clean traffic

    p95, total = compute_p95(registry=registry)
    assert total == 20
    assert p95 < 0.1  # only clean traffic counted


def test_reset_baseline_request_stats_incremental(clear_baseline):
    """After a baseline snapshot, compute_request_stats counts only new requests."""
    registry = CollectorRegistry()
    c = Counter(
        "http_requests_total",
        "Total requests",
        labelnames=["handler", "status"],
        registry=registry,
    )
    c.labels(handler="/api/v1/projects", status="2xx").inc(100)
    c.labels(handler="/api/v1/projects", status="5xx").inc(5)

    reset_metrics_baseline(registry=registry)

    c.labels(handler="/api/v1/projects", status="2xx").inc(50)

    total, errors = compute_request_stats(registry=registry)
    assert total == 50
    assert errors == 0
