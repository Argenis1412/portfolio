"""
Prometheus histogram quantile estimation via bucket interpolation.

Reads raw bucket samples from a CollectorRegistry and computes percentiles
without requiring a running Prometheus server.

NOTE: Excluding /api/v1/chaos/* is a tactical fix on top of a
process-lifetime cumulative histogram. Long-term this should be
replaced by a rolling-window or periodically-reset histogram so
any endpoint outlier decays naturally.
"""

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


def _is_excluded_handler(handler: object) -> bool:
    if not isinstance(handler, str):
        return False
    if handler in EXCLUDED_HANDLER_EXACT:
        return True
    return handler.startswith(EXCLUDED_HANDLER_PREFIXES)


def compute_p95(
    registry: CollectorRegistry = REGISTRY,
    metric_name: str = "http_request_duration_seconds",
    quantile: float = 0.95,
) -> tuple[float, int]:
    """
    Compute an estimated percentile from histogram buckets across all handlers.

    Returns (p_seconds, total_samples). If no data is available,
    returns (0.0, 0).
    """
    buckets: dict[float, float] = {}
    total_samples = 0

    for metric in registry.collect():
        if metric.name != metric_name:
            continue
        for sample in metric.samples:
            handler = sample.labels.get("handler", "")
            if _is_excluded_handler(handler):
                continue

            if sample.name == f"{metric_name}_bucket":
                le = float(sample.labels["le"])
                buckets[le] = buckets.get(le, 0.0) + sample.value
            elif sample.name == f"{metric_name}_count":
                total_samples += int(sample.value)

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
    """
    total = 0
    errors = 0

    for metric in registry.collect():
        if metric.name != metric_name:
            continue
        for sample in metric.samples:
            if sample.name == f"{metric_name}_created":
                continue
            handler = sample.labels.get("handler", "")
            if _is_excluded_handler(handler):
                continue
            count = int(sample.value)
            total += count
            if sample.labels.get("status") == "5xx":
                errors += count

    return total, errors
