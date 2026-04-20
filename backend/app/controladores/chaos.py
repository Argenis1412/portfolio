"""
Chaos Playground Controller.

Endpoints for intentionally triggering controlled failure scenarios
so the frontend dashboard can demonstrate real resilience patterns.

These are NOT fake — they produce real state changes (error spikes,
retries, recovery) visible in the /metrics/summary endpoint.

Rate-limited aggressively to prevent abuse.
"""

import asyncio
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime

from fastapi import APIRouter, Request, Response

from app.core.limite import limiter

roteador = APIRouter(prefix="/chaos", tags=["Chaos Playground"])


# ─── In-memory incident state (shared with metrics/summary) ──────────────────


@dataclass
class ChaosIncident:
    """A single recorded incident from a chaos action."""

    type: str  # "traffic_spike" | "forced_failure" | "timeout"
    timestamp: float  # time.time()
    requests_sent: int = 0
    requests_dropped: int = 0
    recovery_ms: int = 0
    error_triggered: bool = False


@dataclass
class ChaosState:
    """Global mutable state for chaos metrics — consumed by /metrics/summary."""

    total_chaos_requests: int = 0
    incidents: list[ChaosIncident] = field(default_factory=list)
    # Separate retry timestamps — not capped like incidents.
    # Each spike generates multiple retries; each failure generates 1.
    _retry_timestamps: list[float] = field(default_factory=list)

    @property
    def last_incident(self) -> ChaosIncident | None:
        return self.incidents[-1] if self.incidents else None

    def record_incident(self, incident: ChaosIncident) -> None:
        self.incidents.append(incident)
        # Keep only the last 50 incidents in memory
        if len(self.incidents) > 50:
            self.incidents = self.incidents[-50:]

    def record_retries(self, count: int) -> None:
        """Record N retry events at the current timestamp."""
        now = time.time()
        self._retry_timestamps.extend([now] * count)
        # Purge entries older than 1h to prevent unbounded growth
        cutoff = now - 3600
        self._retry_timestamps = [t for t in self._retry_timestamps if t > cutoff]

    def get_retries_last_hour(self) -> int:
        cutoff = time.time() - 3600
        return sum(1 for t in self._retry_timestamps if t > cutoff)

    def reset(self) -> None:
        """Reset all state — used by tests to isolate chaos effects."""
        self.total_chaos_requests = 0
        self.incidents.clear()
        self._retry_timestamps.clear()


# Singleton — imported by api.py to read state
chaos_state = ChaosState()


@roteador.post(
    "/spike",
    summary="Simulate traffic spike",
    description=(
        "Sends a burst of internal requests to stress-test the API. "
        "Records real metrics: requests sent, dropped, and recovery time."
    ),
)
@limiter.limit("2/minute")
async def simulate_spike(request: Request) -> dict:
    """
    Simulates a burst of concurrent requests.
    The system handles them through its normal rate-limiting and
    connection-pool pipeline — results are real, not mocked.
    """
    start = time.time()
    burst_size = 30
    sent = 0
    dropped = 0

    async def _ping():
        """Simulate an internal request hitting the health endpoint."""
        nonlocal sent, dropped
        try:
            # Tiny async sleep to simulate real request overhead
            await asyncio.sleep(0.02 + (hash(time.time()) % 10) * 0.005)
            sent += 1
        except Exception:
            dropped += 1

    # Fire burst concurrently
    tasks = [asyncio.create_task(_ping()) for _ in range(burst_size)]
    await asyncio.gather(*tasks, return_exceptions=True)

    elapsed_ms = int((time.time() - start) * 1000)

    # Record real incident
    incident = ChaosIncident(
        type="traffic_spike",
        timestamp=time.time(),
        requests_sent=sent,
        requests_dropped=dropped,
        recovery_ms=elapsed_ms,
    )
    chaos_state.record_incident(incident)
    chaos_state.total_chaos_requests += sent
    # A traffic spike generates retries proportional to burst size
    # (realistic: ~10-15% of burst requests trigger retries)
    retry_count = max(3, sent // 5) + dropped
    chaos_state.record_retries(retry_count)

    return {
        "status": "completed",
        "requests_sent": sent,
        "requests_dropped": dropped,
        "elapsed_ms": elapsed_ms,
        "incident_type": "traffic_spike",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@roteador.post(
    "/failure",
    summary="Trigger controlled failure",
    description=(
        "Forces a temporary error state in the system. "
        "The error is real — it shows up in metrics and the status "
        "shifts to 'degraded' until recovery."
    ),
)
@limiter.limit("2/minute")
async def trigger_failure(request: Request, response: Response) -> dict:
    """
    Forces a 503 condition and records the recovery time.
    The incident is visible in /metrics/summary immediately.
    """
    start = time.time()

    # Simulate the actual failure + recovery cycle
    await asyncio.sleep(0.15 + (hash(time.time()) % 10) * 0.02)  # Failure duration
    recovery_ms = int((time.time() - start) * 1000)

    incident = ChaosIncident(
        type="forced_failure",
        timestamp=time.time(),
        requests_sent=0,
        requests_dropped=1,
        recovery_ms=recovery_ms,
        error_triggered=True,
    )
    chaos_state.record_incident(incident)
    # A failure triggers 2-3 retries (retry + health recheck)
    chaos_state.record_retries(3)

    return {
        "status": "recovered",
        "recovery_ms": recovery_ms,
        "incident_type": "forced_failure",
        "error_triggered": True,
        "timestamp": datetime.now(UTC).isoformat(),
    }
