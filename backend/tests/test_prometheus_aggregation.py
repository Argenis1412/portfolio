"""Tests for prometheus_aggregation module."""

from prometheus_client import CollectorRegistry, Counter, Histogram

from app.core.prometheus_aggregation import compute_p95, compute_request_stats


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
