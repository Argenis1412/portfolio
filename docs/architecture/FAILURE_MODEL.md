# Explicit Failure Model & Contingency Policies

## Overview
This document outlines the explicit failure model for the Chaos Engineering Playground backend API. It defines the exact behaviors, fallback mechanisms, and retry policies when critical infrastructure components fail, to maintain our target Service Level Objectives (SLOs) and deliver predictable performance even in degraded states.

---

## 1. Database (PostgreSQL) Failures

### Scenario 1.1: Connection Timeout or High Latency (>3000ms)
**Trigger:** Connection pool exhaustion or underlying network latency.
**Detection Mechanism:** SQLAlchemy timeout configuration coupled with Circuit Breaker tracking query durations.

**Contingency Policy:**
- **Timeout Definition:** Any DB transaction exceeding 3 seconds is explicitly aborted by the backend to prevent cascading queue backups.
- **Retry Policy:** Do NOT retry immediate read/writes in-band. A synchronous request demanding an instant DB commit will fail fast and return a `503 Service Unavailable`.
- **Fallback Behavior (Reads):** 
  - The API will seamlessly fallback to serving stale generic data from Redis (if available).
  - The response payload payload includes `"degraded_mode": true`.
- **Fallback Behavior (Writes):** 
  - Critical writes (e.g., Incident tracking logs) are appended to a persistent local dead-letter queue (DLQ) in Redis or a secondary rapid-write buffer to be synced when the DB recovers.
  - Non-critical writes are discarded immediately.

### Scenario 1.2: Hard Disconnect (Connection Refused)
**Trigger:** PostgreSQL instance crash or network partition.
**Detection Mechanism:** `psycopg2.OperationalError` upon connection attempt.

**Contingency Policy:**
- **Circuit Breaker Status:** Immediately trips the DB Circuit Breaker to OPEN state.
- **Behavior:** All endpoints requiring DB interaction bypass the timeout phase entirely and instantly return `503 Service Unavailable` with `reason: "database_partition"`.
- **Mitigation:** The system will attempt a slow ping (1 request every 15 seconds) to test DB health (HALF-OPEN state) before resuming traffic.

---

## 2. Queue & Worker Failures

### Scenario 2.1: Queue Backpressure (High Queue Depth)
**Trigger:** Workers are too slow or a spike in traffic saturates the task queue.
**Detection Mechanism:** Queue length polling exceeds 500 items.

**Contingency Policy:**
- **Dynamic Load Shedding:** Incoming low-priority asynchronous requests are immediately rejected (`429 Too Many Requests`).
- **Retry Policy (Client-side Guidance):** Return headers indicating `Retry-After: 30` and advising clients to use Exponential Backoff.
- **Backend Mitigation:** Initiate "Queue Drain" mechanism if the queue hasn't shortened in 60 seconds, which purges the oldest 20% of non-essential tasks to prevent `OOM` (Out of Memory).

---

## 3. Degradation Telemetry (Frontend Payload Strategy)

When any major component trips its circuit breaker or falls back, the API response must include a formalized Degradation Metadata block:

```json
{
  "status": "success",
  "data": { ... },
  "system_telemetry": {
    "status": "degraded",
    "degraded_components": ["postgresql"],
    "active_circuit_breakers": 1
  }
}
```
*Note: This specific structure will be handled in Epic 3 for the Data/Observability Engineer to formally implement, but the Architect dictates the need for standard payload additions today.*
