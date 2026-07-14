"""
Prometheus histogram quantile estimation via bucket interpolation.

Reads raw bucket samples from a CollectorRegistry and computes percentiles
without requiring a running Prometheus server.

NOTE: Excluding /api/v1/chaos/* is a tactical fix on top of a
process-lifetime cumulative histogram. Long-term this should be
replaced by a rolling-window or periodically-reset histogram so
any endpoint outlier decays naturally.

Baseline reset: after each chaos recovery cycle the caller may call
reset_metrics_baseline() to snapshot current Prometheus state. Subsequent
calls to compute_p95 / compute_request_stats return only incremental data
relative to that snapshot, giving a clean P95 after each incident without
restarting the process.
"""

import threading

from prometheus_client import REGISTRY, CollectorRegistry

EXCLUDED_HANDLER_EXACT = frozenset(
    {
        "/api/v1/metrics/summary",
        "/metrics",
        "/health",
        "/live",
        "/saude",
        "/salud",
    }
)

EXCLUDED_HANDLER_PREFIXES: tuple[str, ...] = ("/api/v1/chaos/",)

# Baseline snapshot: (sample_name, frozenset(labels)) → value at last reset.
# Empty dict means "no baseline" — all cumulative data is used.
_baseline: dict[tuple[str, frozenset], float] = {}
_baseline_lock = threading.Lock()


def _is_excluded_handler(handler: object) -> bool:
    if not isinstance(handler, str):
        return False
    if handler in EXCLUDED_HANDLER_EXACT:
        return True
    return handler.startswith(EXCLUDED_HANDLER_PREFIXES)


def reset_metrics_baseline(registry: CollectorRegistry = REGISTRY) -> None:
    """Snapshot current Prometheus state as the new baseline.

    After this call, compute_p95 and compute_request_stats return only
    data observed since this snapshot — chaos-period contamination is
    excluded without restarting the process.

    Safe to call from async context (no awaits; lock is brief).
    """
    new_baseline: dict[tuple[str, frozenset], float] = {}
    for metric in registry.collect():
        if metric.name not in ("http_request_duration_seconds", "http_requests"):
            continue
        for sample in metric.samples:
            key: tuple[str, frozenset] = (sample.name, frozenset(sample.labels.items()))
            new_baseline[key] = sample.value
    with _baseline_lock:
        global _baseline
        _baseline = new_baseline


def reset_p95_baseline(registry: CollectorRegistry = REGISTRY) -> None:
    """Snapshot only the duration histogram as baseline.

    Unlike reset_metrics_baseline(), this preserves request counters
    (http_requests) so that requests_since_deploy stays continuous —
    avoids triggering the frontend's deploy-reset heuristic on warmup.
    """
    duration_entries: dict[tuple[str, frozenset], float] = {}
    for metric in registry.collect():
        if metric.name != "http_request_duration_seconds":
            continue
        for sample in metric.samples:
            key: tuple[str, frozenset] = (sample.name, frozenset(sample.labels.items()))
            duration_entries[key] = sample.value

    with _baseline_lock:
        global _baseline
        merged = {
            k: v for k, v in _baseline.items()
            if not k[0].startswith("http_request_duration_seconds")
        }
        merged.update(duration_entries)
        _baseline = merged


def _incremental(sample_name: str, labels: dict, raw_value: float) -> float:
    """Return raw_value minus the baseline for this sample, clamped to 0."""
    key: tuple[str, frozenset] = (sample_name, frozenset(labels.items()))
    with _baseline_lock:
        base = _baseline.get(key, 0.0)
    return max(0.0, raw_value - base)


def compute_p95(
    registry: CollectorRegistry = REGISTRY,
    metric_name: str = "http_request_duration_seconds",
    quantile: float = 0.95,
) -> tuple[float, int]:
    """
    Compute an estimated percentile from histogram buckets across all handlers.

    Returns (p_seconds, total_samples). If no data is available,
    returns (0.0, 0).

    Values are relative to the last reset_metrics_baseline() call so that
    chaos-period contamination does not persist across recovery cycles.
    """
    buckets: dict[float, float] = {}
    total_samples = 0

    with _baseline_lock:
        current_baseline = dict(_baseline)

    for metric in registry.collect():
        if metric.name != metric_name:
            continue
        for sample in metric.samples:
            handler = sample.labels.get("handler", "")
            if _is_excluded_handler(handler):
                continue

            key: tuple[str, frozenset] = (sample.name, frozenset(sample.labels.items()))
            incremental = max(0.0, sample.value - current_baseline.get(key, 0.0))

            if sample.name == f"{metric_name}_bucket":
                le = float(sample.labels["le"])
                buckets[le] = buckets.get(le, 0.0) + incremental
            elif sample.name == f"{metric_name}_count":
                total_samples += int(incremental)

    if total_samples == 0 or not buckets:
        return 0.0, 0

    sorted_bounds = sorted(b for b in buckets if b != float("inf"))
    if not sorted_bounds:
        return 0.0, total_samples

    target = quantile * total_samples
    prev_bound = 0.0
    prev_count = 0.0

    for bound in sorted_bounds:
        current_count = buckets[bound]
        if current_count >= target:
            fraction = (target - prev_count) / max(current_count - prev_count, 1e-9)
            return prev_bound + fraction * (bound - prev_bound), total_samples
        prev_bound = bound
        prev_count = current_count

    return sorted_bounds[-1], total_samples


def compute_request_stats(
    registry: CollectorRegistry = REGISTRY,
    metric_name: str = "http_requests",
) -> tuple[int, int]:
    """
    Compute (total_requests, total_5xx) from the requests counter.

    Excludes self-polling handlers. Note: prometheus_client strips the
    _total suffix from metric.name for counters, so we match on the base name.

    Values are relative to the last reset_metrics_baseline() call.
    """
    total = 0
    errors = 0

    with _baseline_lock:
        current_baseline = dict(_baseline)

    for metric in registry.collect():
        if metric.name != metric_name:
            continue
        for sample in metric.samples:
            if sample.name == f"{metric_name}_created":
                continue
            handler = sample.labels.get("handler", "")
            if _is_excluded_handler(handler):
                continue

            key: tuple[str, frozenset] = (sample.name, frozenset(sample.labels.items()))
            count = int(max(0.0, sample.value - current_baseline.get(key, 0.0)))
            total += count
            if sample.labels.get("status") == "5xx":
                errors += count

    return total, errors
