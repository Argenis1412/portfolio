# Resilience and Failure Handling

This document describes the cleanup branch, not a deployed release. Frontend
retirement remains a [release prerequisite](../../CHANGELOG.md#frontend-deployment-dependency).
Historical PostgreSQL and Chaos designs are indexed in the
[failure model](FAILURE_MODEL.md).

## Runtime boundaries

Portfolio reads use local JSON files; the application has no SQL dependency.
Redis supports shared contact protection and the delivery stream. Resend handles
email delivery. One Uvicorn process owns the consumer through the API lifespan
when `WORKER_ENABLED=true`; no separate worker service is required.

## Degradation policy

| Failure | Current behavior | Limit |
|---|---|---|
| Missing, unreadable, or malformed required JSON | `/health` reports file details and degraded status; failed content reads propagate errors. | HTTP 200 from `/health` alone does not establish usable content. Health checks validate top-level types, not every field. |
| Redis rate-limit storage unavailable | Contact checks use a local memory limiter; read-only checks fail open. | Local counters reset on restart and are not shared. If the memory limiter also fails, contact checks allow through as a last resort. |
| Redis deduplication/idempotency unavailable | Stores use process-local memory fallback on Redis exceptions. | This cannot guarantee coordination across replicas or through restarts. A refused Redis lock remains contention, not a reason to acquire a local lock. |
| Stream enqueue unavailable or queue disabled | Contact delivery uses one FastAPI background task. | No durable storage or automatic delivery retries in this mode; process exit can lose accepted work. |
| Stream consumer/provider failure | Retry policy classifies transient, permanent, and unknown errors; exhausted jobs go to the DLQ. | At-least-once processing can duplicate delivery. Acceptance is not inbox delivery. |
| Process unavailable | Requests cannot reach the API. | JSON removes database connection costs, not process startup or hosting/network failures. |

Spam scores flag delivered email rather than dropping it. Honeypots remain
silent drops; validation, duplicate submissions, and exhausted rate limits remain
observable rejections. These policies should not be described as universal
fail-open or fail-silent behavior.

For retry counts, age limits, shutdown behavior, and triage, use the
[operations runbook](production-operations.md). The
[JSON read decision](JSON_FIRST_READ_PATH.md) explains cache and update behavior.

## Verification and user experience

Backend tests exercise degradation and delivery decisions without proving live
provider health. Docker validation and a deployment-sized load test remain
pending. Review frontend retries, loading/error views, and contract consumption
as part of frontend retirement; older descriptions of UI defaults are not
backend availability guarantees.

Prometheus, structured logs, and optional Sentry/OpenTelemetry provide evidence
for diagnosis. Verify actual alert rules and external monitor targets before
claiming coverage. See the [SLO targets](SLO_DEFINITIONS.md); no current production
compliance is established by this documentation.
