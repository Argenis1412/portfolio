# Service Level Objectives (SLOs)

These are retained engineering targets, not verified compliance claims for the
cleanup branch. No live production measurements or new load test were collected
for this documentation update. The [operations runbook](production-operations.md)
records pending release checks and the frontend deployment blocker.

## Targets and alert proposals

| Scope | Retained objective | Proposed alert trigger |
|---|---|---|
| Static portfolio reads (`/api/v1/about`, `/api/v1/projects`, `/api/v1/stack`, `/api/v1/experiences`) | P95 < 100 ms | P95 > 100 ms for 5 minutes, or errors > 0.5% for 15 minutes. |
| `POST /api/v1/contact` acceptance | P95 < 200 ms | P95 > 200 ms for 5 minutes, 5xx > 0.5% for 15 minutes, or Redis connection failures > 1% for 5 minutes. |
| `GET /health` | P99 < 100 ms | P99 > 100 ms for 3 minutes, non-200 on two consecutive checks, or probe failure. Also inspect degraded response bodies. |
| Global HTTP errors | At most 0.5% 5xx over a rolling 15-minute window | Above 0.5% for 15 minutes (warning); above 2% for 5 minutes (critical). |
| Critical reads and health | 99.9% availability over a rolling 30 days | Below 99.9% over 1 hour is an early warning, not the 30-day objective calculation. |

A 30-day availability budget at 99.9% is 43.2 minutes. These thresholds require
verified monitor configuration, scope, minimum sample counts, and routing before
being described as deployed alerts. Define the Redis failure ratio denominator
explicitly when implementing that alert; it is not supplied by a log event alone.

## Measurement contract

Use the protected Prometheus endpoint for HTTP counters and duration histograms.
Inspect exported metric names and labels before writing queries; do not assume a
`path` label where the instrumentator exports `handler`. Calculate rolling error
ratios from counter rates over the same route set and window, not lifetime totals.

Measure each target's route population separately. Histogram quantiles are bucket
estimates and become unstable under sparse traffic. Record sample count, window,
release, cold/warm conditions, and concurrency alongside results. Client timings
include network and browser costs and must be identified separately from server
latency. Synthetic UI values are not backend SLI evidence.

`/api/v1/metrics/summary` is a process-local aggregate. Its P95 excludes probe and
metrics routes and uses a duration baseline reset after warmup; request/error
counters retain process-lifetime totals. It cannot establish an endpoint's rolling
SLO or aggregate replicas. Use external collection for windowed, multi-instance
measurements and probes for availability.

Contact latency measures acceptance, including protection and queue submission,
not asynchronous Resend delivery or a PostgreSQL write. Background fallback has
no automatic retry guarantee. Track worker/provider failures and DLQ evidence
separately; an inbox-delivery SLO requires its own definition and instrumentation.
Redis rate-limit failures use local contact protection and fail-open reads; see
the [failure model](FAILURE_MODEL.md) for events and limits.

The HTTP instrumentator excludes `/health`, `/live`, `/saude`, `/salud`, and
`/metrics`; the health latency objective therefore needs external probe timings
or separately added instrumentation. Its built-in counters also ignore
untemplated routes, so a global ratio must state which requests are eligible.

`/health` checks JSON without network requests and can return HTTP 200 while
`status="degraded"`. Monitor its body as well as transport success. `/live` only
checks process response. External monitor configuration and legacy alias targets
remain unverified. Backend Chaos endpoints are retired; historical synthetic
failure exclusions do not justify discarding current unexpected failures.

## Historical evidence

INC-002 recorded 280-400 ms database-related read latency before JSON-first reads.
Older reports described sub-50 ms improvements and later low-volume histogram
estimates around 79 ms. Those results do not establish current performance, and
the earlier description of `/health` as a database probe is obsolete.

The previous SLO document recorded cold-start P95 around 3.5 seconds, warm P95
around 1.3 seconds at five virtual users, and roughly 9.7% errors during a
20-user ramp. These remain historical observations, not measurements of this
branch or proof of a specific infrastructure root cause. The previous wording is
available with `git show 9211c24:docs/architecture/SLO_DEFINITIONS.md`; see also the
[recorded benchmark](../../benchmarks/results/02c08d3/summary.md).

Re-establish baselines for the single-process API/consumer deployment before
claiming compliance or changing targets. Keep historical results tied to their
recorded release and test conditions.
