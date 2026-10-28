# Portfolio Backend

Python 3.12 and FastAPI serve checked-in [JSON content](data/). Redis supplies
shared request protection and Streams delivery; Resend sends contact email.
There is no SQL application dependency, migration, or seed step.

## Run locally

Use the [root setup](../README.md#local-development) to install both requirements
files into a Python 3.12 virtual environment, copy the shared
[environment example](../.env.example) to `backend/.env`, and start Uvicorn from
`backend/`. API docs are available at [localhost:8000/docs](http://localhost:8000/docs).
Without Redis, local contact processing uses memory/background tasks. An empty
Resend API key selects console delivery in non-production environments.

## Configuration

[Settings](app/settings.py) defines defaults and validation. Important groups:

| Variables | Purpose |
|---|---|
| `APP_NAME`, `ENVIRONMENT` | Service name; `local`, `development`, `testing`, `staging`, or `production`. |
| `ALLOWED_ORIGINS`, `REGEX_ALLOWED_ORIGINS` | Comma-separated origins plus optional origin regex; either can allow access. |
| `REDIS_URL`, `WORKER_ENABLED` | Shared protection and stream queue; the in-process consumer defaults to enabled. |
| `REDIS_SOCKET_TIMEOUT_SECONDS`, `REDIS_CONNECT_TIMEOUT_SECONDS` | Async Redis clients default to 5 seconds each; blocking worker clients use 60/10 seconds. |
| `RATE_LIMIT_REDIS_TIMEOUT_SECONDS` | Synchronous rate-limit Redis timeout, default 1 second; finite and positive. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_TO_EMAIL` | Delivery provider; sender defaults to `onboarding@resend.dev`. |
| `METRICS_BASIC_AUTH_USERNAME`, `METRICS_BASIC_AUTH_PASSWORD` | Production `/metrics` authentication. |
| `OTEL_ENABLED`, `OTLP_ENDPOINT`, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE` | Optional telemetry; [observability reference](../docs/architecture/observability.md). |
| `TRUSTED_PROXY_DEPTH`, `TRUSTED_PROXY_IPS` | Forwarded client identity and optional peer allowlist. |

Production startup requires Redis, metrics credentials, and nonblank Resend API
key/recipient. It rejects wildcard origins and explicitly unrestricted regexes
`.*` / `^.*$`; it does not assess every permissive regex or provider connectivity.
Interactive docs and OpenAPI are disabled in production.

Application settings use English names; old Portuguese application keys must be
migrated locally. Terraform intentionally retains legacy secret identities and
maps them to English application keys; see [infrastructure](../infrastructure/README.md).
Legacy `DATABASE_URL` / `DB_*` settings are ignored by the application.

## API

| Canonical endpoint | Behavior |
|---|---|
| `GET /live` | Process liveness. |
| `GET /health` | JSON file checks, email configuration, version, and uptime. |
| `GET /api/v1/{about,projects,stack,experiences,formation,philosophy}` | Portfolio content with ETag responses. |
| `GET /api/v1/projects/{id}` | Project details; 404 for unknown IDs. |
| `POST /api/v1/contact` | Validated contact acceptance, HTTP 200, with `success`, `message`, `queue_status`, `delivery_mode`, and `downstream`. |
| `GET /api/v1/metrics/summary` | Process-local observed P95, request/error counts, uptime, and derived status. |
| `GET /metrics` | HTTP/worker Prometheus metrics; Basic Auth in production. |

`/health` returns HTTP 200 even when degraded. It checks JSON readability, syntax,
and expected top-level types, including the optional sidecar when present. It
neither validates every field nor tests Redis/Resend connectivity. Deprecated
`/saude` / `/salud` routes remain static liveness-style responses.
Chaos routes are retired. See [reads and caching](../docs/architecture/JSON_FIRST_READ_PATH.md).

## Reliability and failure behavior

| Boundary | Implemented behavior and limit |
|---|---|
| Validation and spam | Request validation precedes idempotency. Honeypots silently accept/drop; scoring labels delivered messages. Normalized email/message deduplication lasts 30 minutes. Limits are 10/day and 20/minute per email, 30/hour per IP and fingerprint. |
| Redis outage | Contact limiting uses local memory; read limiting fails open. A failed memory limiter also allows through. The rate limiter bypasses Redis for 30 seconds after an error; its first synchronous attempt can still block the event loop. Socket timeouts are not request deadlines. |
| Deduplication/idempotency fallback | Redis exceptions allow process-local memory, lost on restart and unshared across replicas. Redis lock refusal remains contention, never a second local acquisition. |
| Idempotency | Optional `Idempotency-Key` or legacy `X-Idempotency-Key` replays finalized responses; occupied reservations return 409. Acquisition backend and owner tokens are retained; Lua comparisons protect successor records. |
| Cancellation | Acquisition/cleanup are shielded, bounded to 10 seconds each, and joined before cancellation propagates. Redis locks have a 30-second TTL. Expiry can permit overlapping processing; finalizing an absent key cannot recover ownership history. |
| Stream delivery | One consumer per API instance when enabled, with supervisor backoff and pending recovery. Transient provider failures get up to three retries, unknown failures one, permanent failures none. Jobs older than 15 minutes are not requeued. Retry/DLQ publication precedes ACK. |
| Queue unavailable | Missing queue or failed enqueue schedules a FastAPI background task, without durability or automatic retry. |

Stream processing is at least once. A crash after sending but before ACK can
repeat email. HTTP acceptance, including honeypot responses, does not establish
provider acceptance or inbox delivery. See [triage](../docs/architecture/production-operations.md#triage).

## Browser access and security

CORS uses the origin list and regex together, with credentials enabled, methods
`GET`/`POST`/`OPTIONS`, and request headers `Content-Type`, `Idempotency-Key`,
`Authorization`, and temporary `X-Chaos-Preset`. The backend ignores that Chaos
header; current frontend code no longer sends it. Retire the allowance only after
checking deployed/cached clients. Exposed headers are `X-Trace-ID`, `X-Request-ID`,
and `X-Response-Time`. ETag is not exposed, and `If-None-Match` is not explicitly
allowed for manual cross-origin JavaScript revalidation.

The default origin regex admits configured portfolio/preview patterns and local
HTTP ports. Local patterns are not automatically removed in production. Review
[settings](app/settings.py) alongside frontend [CSP](../frontend/vercel.json) when
changing domains. CORS governs browsers and does not authenticate HTTP callers.

A nonempty `TRUSTED_PROXY_IPS` enables peer allowlisting for forwarded identity.
The default empty allowlist uses depth-based compatibility mode; verify the proxy
chain before relying on IP protection.

[Middleware](app/core/middleware.py) adds `nosniff`, frame denial, a restrictive API
CSP outside docs paths, referrer/permissions policy, and HSTS in production or HTTPS.
These apply to responses passing through the middleware; HSTS `preload` is not
proof of browser enrollment. Gzip starts at 1000 bytes subject to negotiation.
Email HTML escapes user fields. Logging masks selected fields only; see
[data handling limits](../docs/architecture/observability.md#logging-and-data-handling).

## Code and checks

Controllers compose injected use cases/adapters; domain import boundaries have
architecture tests. `app/core/` owns protection/telemetry; `app/worker.py` runs in
the API lifespan. Docker starts one Uvicorn process; no standalone worker command
or Compose worker service exists. Shutdown gives the consumer up to five seconds
before cancellation and closes Redis connections.

From `backend/`, with its virtual environment active:

```bash
python -m ruff check .
python -m ruff format --check .
python -m mypy --config-file pyproject.toml
python -m pytest
```

Pytest enforces 80% coverage and mocks email. Mypy gradually checks `app/`;
unannotated function bodies are not generally checked. Review public content
snapshot changes deliberately. Real-Redis tests skip without `REDIS_TEST_URL`:

```bash
# Only with a disposable local Redis database /15 already running:
REDIS_TEST_URL=redis://127.0.0.1:16379/15 python -m pytest
```

Fixtures reject remote hosts, credentials, and other databases. Worker fixtures
flush `/15`; contact fixtures clean unique keys. CI supplies disposable Redis.
`python scripts/check_resend.py` checks configuration without sending;
`--send` explicitly sends real email. Release/environment checks are in the
[runbook](../docs/architecture/production-operations.md#release-checks).
