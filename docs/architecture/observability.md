# Observability and Logging

[app/core/observability.py](../../backend/app/core/observability.py) configures
Sentry, Prometheus, then optional OpenTelemetry from shared settings. Tests select
external-service behavior explicitly. Public portfolio routes do not poll metrics;
backend telemetry remains available.

## Configuration

| Mechanism | Implemented behavior |
|---|---|
| Sentry | Nonempty `SENTRY_DSN` enables backend integrations with `SENTRY_TRACES_SAMPLE_RATE` and `send_default_pii=False`. Frontend uses its separate `VITE_SENTRY_DSN`. |
| Prometheus | HTTP counters/duration histograms and worker metrics. `/metrics` requires Basic Auth in production. |
| OpenTelemetry | `OTEL_ENABLED` defaults to true. `OTLP_ENDPOINT` selects OTLP/HTTP export; `/v1/traces` is appended when needed. Empty endpoint uses console export outside production and skips instrumentation/export in production. |

`OTEL_ENABLED=false` leaves Prometheus and Sentry independent. Sentry uses its SDK;
OTLP URLs containing `sentry.io` are ignored by the exporter. Collector/exporter
reachability needs separate verification.

## HTTP and worker metrics

HTTP instrumentation groups status codes and ignores untemplated routes. It
excludes `/metrics`, `/health`, `/live`, `/saude`, and `/salud`. Inspect eligible
handlers and exported labels before calculating ratios.

Worker metrics cover outcomes/duration, retries, DLQ transfers, pending/recovery,
reclaimed jobs, quota blocks, and supervisor availability/restarts. These are
process observations; a zero/missing series is not proof of successful delivery
or an authoritative total backlog.

`/api/v1/metrics/summary` exposes observed latency, counters, status, and uptime.
It resets the latency baseline after warmup while counters retain process-lifetime
totals. See the [measurement contract](SLO_DEFINITIONS.md#measurement-contract).

## Logging and data handling

[logger_adapter.py](../../backend/app/adapters/logger_adapter.py) configures
structlog once at INFO level: context variables, selected field masking, ISO
timestamps, exception formatting, and terminal output or JSON otherwise.
Request events include `request_received`, `response_sent`, and
`request_processing_error`. Normal responses add `X-Request-ID` and
`X-Response-Time`; an active valid span can add `X-Trace-ID`. Request/span/job
correlation depends on execution context and is not universal.

Top-level email/phone fields are masked; email retains at most one local-part
character, and long phones retain first/last two digits. Recognized sensitive
query keys are redacted. These processors do not recursively scrub arbitrary
text, paths, nested objects, IPs, or exceptions. Choose fields deliberately and
keep credentials/contact bodies out of logs and exported artifacts.

Useful degradation signals include `rate_limiter_degraded_mode`,
`rate_limiter_backend_unavailable`, `rate_limit_backend_unavailable_total`,
`queue_unavailable_fallback_background`, and `contact_queued` with delivery mode.
Worker retry/DLQ events explain delivery attempts; acceptance is not inbox arrival.
Use the [runbook](production-operations.md#triage) for interpretation and recovery.

## Local monitoring

[Docker Compose](../../docker-compose.yml) starts the API, Redis, and these services:

| Service | Local URL | Configuration |
|---|---|---|
| Prometheus | [localhost:9090](http://localhost:9090) | [Scrapes](../../infra/monitoring/prometheus.yml) target `api:8000/metrics`. |
| Grafana | [localhost:3000](http://localhost:3000) | User `admin`, password from required `GRAFANA_ADMIN_PASSWORD`; [dashboard](../../infra/monitoring/grafana/provisioning/dashboards/api_overview.json). |
| Jaeger | [localhost:16686](http://localhost:16686) | OTLP/HTTP port 4318; set `OTLP_ENDPOINT=http://jaeger:4318` in the root `.env` to export API spans there. |

[Alert rules](../../infra/monitoring/alert.rules.yml) cover unreachable scraping,
5xx, and P95 above 500 ms. `HighErrorRate` selects `status_code`, whereas the
instrumentator/dashboard use `status`; the selector needs a separately scoped
correction and verification. No Alertmanager service or notification routing is
configured by Compose. Production scraping/authentication and external monitors
have not been verified by this audit.
