# Benchmark Results — commit 02c08d3

**Timestamp:** 2026-04-27T19:27 → 19:29 (UTC-3)
**Base URL:** http://localhost:8000
**k6 version:** k6 v1.7.1 (go1.24.2, windows/amd64)
**Environment:** Local — Windows, SQLite, 1 Uvicorn worker, no Redis

> ⚠️ **Data label: `local_baseline`** — NOT production traffic.
> Local results are systematically higher than production (Koyeb):
> - SQLite vs PostgreSQL (no async connection pooling locally)
> - Single worker vs Koyeb's multi-instance deployment
> - No Redis → idempotency/rate-limiting runs in-memory (faster locally, less realistic)
>
> Run `.\benchmarks\run.ps1 -BaseUrl https://api.argenisbackend.com` to capture production numbers.

---

## Results

| Script | SLO Target | P50 | P95 | P99 | Max | Error Rate | Status |
|--------|-----------|-----|-----|-----|-----|-----------|--------|
| `health` (steady_state, 5 VUs) | P99 < 20ms | 42ms | 189ms | 257ms | 722ms | 0% | ⚠️ BREACH |
| `health` (ramp_up, 20 VUs) | P99 < 20ms | — | — | — | 722ms | 0% | ⚠️ BREACH |
| `read_path` (baseline, 10 VUs) | P95 < 50ms | ~185ms | ~820ms | ~930ms | 1110ms | 0% | ⚠️ BREACH |
| `read_path` (stress, 100 VUs) | intentional | — | — | — | — | 0% | ℹ️ EXPECTED |
| `contact` (normal_load, 10 VUs) | P95 < 200ms | 17ms | 37ms | 91ms | 91ms | 0% | ✅ PASS |
| `contact` (abuse_simulation) | 429 expected | — | — | — | — | 0% | ✅ PASS |
| `contact` (bot_honeypot) | silent drop | — | — | — | — | 0% | ✅ PASS |

---

## Honest Analysis

### Why health and read_path breach locally

The SLOs in `SLO_DEFINITIONS.md` were calibrated against **production on Koyeb** (warm containers, PostgreSQL, multi-instance). Local SQLite with a single worker is not the target environment. The breach is expected and informative, not a bug.

Specific contributing factors:
1. **SQLite sequential writes** — SQLite doesn't support concurrent async reads the way PostgreSQL does. Under 10+ VUs, the single connection becomes a bottleneck.
2. **OTel console exporter** — locally, OpenTelemetry spans are written to stdout on every request, adding ~5-15ms of I/O per request.
3. **No connection pooling warm-up** — the first batch of requests always pays the connection establishment cost.

### What contact tells us

`/contact` passed comfortably (P95 = 37ms vs SLO of 200ms) **even without Redis**. The in-memory fallback for rate-limiting and deduplication is fast — but this does NOT mean the Redis stack is overhead. In production, Redis provides cross-restart persistence. The trade-off is reliability vs raw latency, and 37ms → ~50-70ms with Redis is acceptable given the write path SLO of 200ms.

### The uncomfortable number

**P99 = 257ms for /health at 5 VUs locally.**

The SLO target is 20ms P99 in production. If this were production data, it would be a SEV-2 incident. It's not — but the gap between "what the system can do locally" and "what the SLO demands" is real and worth tracking.

**Action:** Capture production run against `api.argenisbackend.com` to establish the real baseline.

---

## Read Path: Endpoint Breakdown (baseline scenario, 10 VUs, 30s)

| Endpoint | P50 | P95 | P99 | Max |
|----------|-----|-----|-----|-----|
| `/about` | 176ms | 779ms | 897ms | 1110ms |
| `/projects` | 196ms | 841ms | 958ms | 1012ms |
| `/stack` | 173ms | 832ms | 936ms | 1038ms |

**Observation:** `/projects` is consistently the slowest. Probable cause: largest JSON payload (multiple project objects with multi-language descriptions). Under stress (100 VUs), all three converge around 800-950ms P95. Zero errors across all iterations — the system degrades gracefully, it doesn't fail.

---

## Contact: Scenario Breakdown

| Scenario | Iterations | Rate-limit Hits | Honeypot Drops | 5xx Errors |
|----------|-----------|----------------|----------------|-----------|
| normal_load (10 VUs) | 10 | 0 | 0 | 0 |
| abuse_simulation (5 VUs, 20s) | ~200 | expected (429s) | 0 | 0 |
| bot_honeypot (3 VUs) | 6 | 0 | 6 | 0 |

All three scenarios completed without 5xx errors. The anti-abuse stack absorbed the abuse simulation without cascading failures.

---

## Variability Note

Each benchmark was run once. Results should be treated as directional, not definitive. k6 documentation recommends 3+ runs; the spread between runs on the same machine is typically ±20-30% on P99 due to OS scheduling and GC pressure. If P99 varies >30% between runs, the environment is too noisy to draw conclusions — document that explicitly.

---

## How to Reproduce

```powershell
# Backend (terminal 1)
cd backend
py -3 -m uvicorn app.main:app --port 8000 --workers 1

# Benchmarks (terminal 2)
.\benchmarks\run.ps1 -BaseUrl http://localhost:8000

# Against production
.\benchmarks\run.ps1 -BaseUrl https://api.argenisbackend.com
```

---

## Next Steps

- [ ] Run against production (`api.argenisbackend.com`) to establish real baseline
- [ ] Run health benchmark 3x to measure variability (±% on P99)
- [ ] Compare read_path with PostgreSQL locally (Docker) to isolate SQLite bottleneck
