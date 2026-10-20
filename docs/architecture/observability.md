# Backend Observability

This document describes the cleanup branch. Frontend Chaos consumers still block
release; see the [deployment dependency](../../CHANGELOG.md#frontend-deployment-dependency).
Local instrumentation and passing tests do not establish live collector, alert,
or dashboard coverage.

## Configuration and ownership

`app/core/observability.py` configures Sentry, Prometheus, then optional
OpenTelemetry. Settings come from the shared environment configuration; no
production code detects pytest. Tests explicitly disable external telemetry.

| Mechanism | Current behavior | Limit |
|---|---|---|
| Sentry | A non-empty `SENTRY_DSN` initializes the FastAPI/Starlette integrations with `SENTRY_TRACES_SAMPLE_RATE` and `send_default_pii=False`. | An empty DSN disables initialization. This setting is not comprehensive sanitization of application fields. |
| Prometheus | `prometheus-fastapi-instrumentator` registers HTTP counters and duration histograms; worker metrics are registered separately. | Neither SlowAPI nor Pydantic provides this HTTP instrumentation. Only the explicitly added metric callbacks should be assumed available. |
| OpenTelemetry | `OTEL_ENABLED` defaults to true and controls FastAPI tracing setup. `OTLP_ENDPOINT` selects OTLP/HTTP export. | Disabling OpenTelemetry leaves Prometheus and Sentry independently configured. |

With OpenTelemetry enabled and no endpoint, non-production environments export
spans to the console; production skips OpenTelemetry instrumentation/export.
A configured collector URL receives `/v1/traces` unless already suffixed.
Endpoints containing `sentry.io` are ignored by this exporter; Sentry uses its own
SDK. Verify collector reachability and exported spans separately.

## HTTP and worker metrics

`/metrics` requires Basic Auth in production; production settings require both
credentials. Other environments do not use this middleware restriction. Do not
put scrape credentials in URLs or logs.

HTTP instrumentation groups status labels (`2xx`, `4xx`, `5xx`), ignores
untemplated routes, and excludes `/metrics`, `/health`, `/live`, `/saude`, and
`/salud`. Exported handler labels and route eligibility matter when defining
ratios. Health latency needs external timing or separate instrumentation.

Worker metrics cover processed outcomes, job duration, retries, DLQ transfers,
pending entries, recovery, reclaimed messages, and Redis quota blocks. They are
observations from this process, not proof of inbox delivery or an authoritative
total stream backlog. Verify scrape output and consumer activity before treating
an absent or zero series as a healthy worker.

`/api/v1/metrics/summary` derives latency, HTTP counts/errors, status, and uptime.
It excludes probe/metrics routes, resets the latency baseline after warmup, and
retains process-lifetime request/error counters. It is not a rolling SLO window
or a cross-replica aggregate. Histogram quantiles require sample-count context;
see the [SLO measurement contract](SLO_DEFINITIONS.md#measurement-contract).

## Correlation and historical UI design

Request middleware generates `X-Request-ID`, logs response duration, and adds
`X-Trace-ID` when a valid active OpenTelemetry span is available. The tracing hook
reads `x-request-id` from incoming ASGI headers; it does not guarantee that the
middleware-generated ID is attached to every span. Request IDs and trace IDs are
separate identifiers. See the [logging guide](LOGGING_AND_DEGRADATION.md).

The previous document described synthetic frontend P95 projections, reconciliation,
and Chaos lifecycle states. Those describe the older UI design, not the current
backend contract. Retired simulation fields must not be used as backend SLI
measurements. Original wording remains available with
`git show f3ceea8:docs/architecture/observability.md`.

Use the [operations runbook](production-operations.md) for triage. Actual scrape
targets, exporters, dashboards, alert rules, and routing need deployment evidence;
this document does not claim they have been verified.
