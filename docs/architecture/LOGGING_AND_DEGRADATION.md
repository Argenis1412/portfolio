# Structured Logging and Degradation Evidence

This guide describes the cleanup branch. For accepted failure behavior, use the
[failure model](FAILURE_MODEL.md); for recovery, use the
[operations runbook](production-operations.md).

## Format and request context

`configure_structlog()` in `app/adapters/logger_adapter.py` configures logging
once. It merges context variables, masks selected PII fields, adds level and ISO
timestamp, formats exceptions, and renders human-readable output when stderr is
a terminal or JSON otherwise. The configured filtering threshold is INFO;
calling `debug()` does not imply a debug event is emitted.

Request middleware generates a UUID request ID, binds method/path context, and
logs `request_received`, `response_sent`, or `request_processing_error`. Normal
response processing adds `X-Request-ID` and `X-Response-Time`; a valid active
OpenTelemetry span can also supply `X-Trace-ID`. Correlation is conditional on
middleware/span execution, not guaranteed for every error or asynchronous job.
Use job IDs and consumer identity when following stream processing.

## Data handling limits

- The processor masks top-level string `email` and `phone` fields. Shared email
  masking retains at most one local-part character and a lowercase domain;
  phone masking retains the first/last two digits when more than four exist.
- Request query logging redacts recognized names such as `token`, `api_key`,
  `email`, and `password`, case-insensitively. Other parameter names remain.
  Email-prefixed request identities use the shared mask.
- These transformations do not recursively sanitize nested objects, arbitrary
  strings, exception text, paths, IP addresses, or every possible query key.
  Select fields deliberately; do not log contact bodies, credentials, or provider
  response bodies. `send_default_pii=False` in Sentry is a separate SDK setting.

## Events that explain degradation

| Evidence | Meaning | Interpretation limit |
|---|---|---|
| `rate_limiter_degraded_mode` | Contact protection attempted local rate limiting after primary storage failure. | Local state is not shared or durable; even this fallback can fail open. |
| `rate_limiter_backend_unavailable` | Read-only rate limiting failed open. | It does not mean the content read itself failed. |
| `rate_limit_backend_unavailable_total{path,mode}` | Counts primary storage failures during rate-limit evaluation. | Modes distinguish `degraded` and `fail_open`; this is not a total count of all Redis operations. |
| `queue_unavailable_fallback_background` | Stream enqueue failed and delivery switched to a background task. | A disabled/missing queue also uses fallback without this enqueue-failure event. |
| `contact_queued` with `delivery_mode` | Records stream or background acceptance after contact checks. | It does not establish provider acceptance or inbox delivery. |
| `job_retry_scheduled`, `job_moved_to_dlq` | The consumer scheduled a retry or transferred failed work. | Reconcile job IDs with acknowledgment and provider evidence; at-least-once processing can duplicate delivery. |

Worker metrics complement these events; see the
[observability guide](observability.md#http-and-worker-metrics). `/health` reports
JSON file status and email configuration, not Redis or Resend connectivity.
Check degraded bodies even when HTTP status is 200.

## Previous design examples

The previous document proposed database-timeout/CPU rules, automatic circuit
breaker transitions, purging 20% of a queue, a survival payload, and UI animation
or polling directives. Those examples are not implemented by the current API
and do not establish that the proposed automation ever ran. SQL and Chaos API
paths are retired. The consumer's Redis quota circuit breaker is a separate
mechanism, not evidence of those CPU/database rules or queue purging.

Original examples remain available with
`git show f3ceea8:docs/architecture/LOGGING_AND_DEGRADATION.md`.
There is no current `system_telemetry` wrapper or server-issued `ui_directives`
contract. Any future automated action needs its own scoped implementation and
verification; this cleanup does not add alert routing or destructive queue actions.
