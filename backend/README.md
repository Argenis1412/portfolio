# Portfolio Backend

Python 3.12 and FastAPI serve portfolio content from memory-cached JSON files in
`data/`. Contact messages use Redis Streams and Resend, with background delivery
when the queue is unavailable. SQL, database drivers, migrations, and seeding are
no longer required.

## Run locally

From `backend/`:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
```

Copy `../.env.example` to `.env` (PowerShell: `Copy-Item ../.env.example .env`),
configure email if needed, then run:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Local API documentation is available at `/docs`. Interactive documentation is
disabled in production. Without Resend credentials, local delivery is logged by
the console adapter. Without Redis, contact processing uses in-memory protection
and background tasks; production requires Redis and nonblank `RESEND_API_KEY`
and `RESEND_TO_EMAIL`. Missing production delivery credentials fail startup.

## Configuration

| Variables | Purpose |
|---|---|
| `APP_NAME`, `ENVIRONMENT` | Service name and environment; use `production` in production. |
| `ALLOWED_ORIGINS`, `REGEX_ALLOWED_ORIGINS` | Browser CORS origins and optional origin regex. |
| `REDIS_URL` | Shared rate limiting, idempotency, deduplication, and contact queue. |
| `REDIS_SOCKET_TIMEOUT_SECONDS`, `REDIS_CONNECT_TIMEOUT_SECONDS` | Timeouts for nonblocking application Redis clients; defaults are 5 seconds. The worker retains 60-second socket and 10-second connection timeouts for its blocking reads. |
| `WORKER_ENABLED` | Start the contact consumer inside the API; defaults to `true`. Set `false` in tests or when deliberately pausing queue consumption. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_TO_EMAIL` | API key and recipient are required in production; sender has a default. Console delivery remains available locally. |
| `METRICS_BASIC_AUTH_USERNAME`, `METRICS_BASIC_AUTH_PASSWORD` | Required protection for `/metrics` in production. |
| `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `OTLP_ENDPOINT` | Optional error tracking and tracing. |
| `OTEL_ENABLED` | Enable OpenTelemetry; defaults to `true`. Set `false` to disable instrumentation and trace export. Prometheus and Sentry are configured independently. |
| `TRUSTED_PROXY_DEPTH`, `TRUSTED_PROXY_IPS` | Trusted proxy configuration for client IP extraction. |

Only English configuration keys are supported. Valid environments are `local`,
`development`, `testing`, `staging`, and `production`; unknown values fail validation.
Legacy `DATABASE_URL` and `DB_*` settings are ignored. See `app/settings.py` for
defaults and production guards.

Before running this branch with an existing `.env`, rename `AMBIENTE` to
`ENVIRONMENT`, `NOME_APP` to `APP_NAME`, `ORIGENS_PERMITIDAS` to `ALLOWED_ORIGINS`,
and `REGEX_ORIGENS_PERMITIDAS` to `REGEX_ALLOWED_ORIGINS`. Use `development`
instead of `desenvolvimento`, `production` instead of `producao`/`producción`, and
`staging` instead of `homologação`. Preserve credential values when renaming keys.
The real Koyeb environment value remains to be verified before deployment.

For Compose, copy the same root example to the root `.env` and set
`GRAFANA_ADMIN_PASSWORD`. Compose passes that file to the API, overrides its
environment to `development`, and points it to the internal Redis service.

## API

| Endpoint | Behavior |
|---|---|
| `GET /live` | Process liveness with no dependency or file checks. |
| `GET /health` | JSON file checks, email configuration, version, and uptime. |
| `GET /api/v1/{about,projects,stack,experiences,formation,philosophy}` | Portfolio content with ETag caching. |
| `GET /api/v1/projects/{id}` | Project details; 404 for an unknown ID. |
| `POST /api/v1/contact` | Validated, rate-limited contact submission with deduplication and optional idempotency key. |
| `GET /api/v1/metrics/summary` | Observed P95, request/error counts, uptime, and derived status. |
| `GET /metrics` | Prometheus HTTP and worker metrics; Basic Auth in production. |

`/health` returns HTTP 200 with `status="ok"` or `status="degraded"`. Its details
contain `data`, per-file `data_details`, and informational `email` configuration.
It reads required JSON files, checks syntax and top-level types, and checks the
optional project case-study sidecar when present. It does not validate every
content field or contact Redis, Resend, or a database.

The P95 warmup reset preserves lifetime request/error counters. Metrics are local
to each API process. Simulation endpoints and failure injection have been removed;
the pending frontend retirement is listed in the root CHANGELOG. Deploy both
changes together.

## Code and checks

Controllers handle HTTP, use cases retrieve/sort content and submit messages,
entities describe domain data, and adapters implement JSON reads and delivery.
`app/core/` contains shared request protection and telemetry; `app/worker.py`
consumes contact jobs inside the API lifespan when Redis is configured and
`WORKER_ENABLED=true`. Docker runs one Uvicorn process, so each API instance owns
one consumer and one process-local metrics registry. Consumer names are unique
across instances. Shutdown stops the consumer, allows up to five seconds to finish,
then cancels it and closes its Redis connection. Pending jobs remain available for
Redis Streams recovery. There is no standalone worker command or Compose service.
Capacity under this single-process configuration still needs a deployment-sized
load test before changing the scaling model.

Resend timeouts, network failures, HTTP 429, and HTTP 5xx failures receive up to
three retries with exponential backoff and jitter. Other rejected HTTP responses
and missing provider configuration go directly to `contact_jobs_dlq`. Unknown
failures receive one retry. Jobs older than 15 minutes are not requeued. The worker
publishes a retry or DLQ entry before acknowledging the original job. These
automatic retries apply to Redis Streams delivery; the background fallback logs
failures without retrying. Acceptance does not confirm delivery to the inbox.

Contact scoring labels messages instead of dropping them: scores 30-69 use
`POSSIBLE SPAM`, and 70-100 use `LIKELY SPAM` in the email subject. All scored
submissions still pass deduplication and email/IP/fingerprint limits. Only filled
honeypots are silently discarded, with the same acceptance response as a normal
submission. Email format and field lengths are validated by Pydantic; blank names
or messages return 422. International names and subjects are preserved, message
paragraphs remain intact, and user fields are escaped in the email HTML.

```bash
ruff check .
ruff format --check .
python -m mypy --config-file pyproject.toml
pytest
```

Mypy checks all of `app/` using the gradual configuration in `pyproject.toml`.
Install both requirements files and activate the backend virtual environment so
local checks and CI use the same dependencies. The optional pre-commit check
uses this environment and configuration too; run it from the repository root
with `python -m pre_commit run mypy --all-files`. The active Git hook is Husky
and currently runs frontend lint-staged tasks only.

Pytest enforces 80% coverage and mocks email delivery. Content snapshots in
`tests/snapshots/content.json` protect the public JSON contract; review snapshot
updates deliberately when changing portfolio content or response mappings.

`python scripts/check_resend.py` reports configuration presence without printing
credentials or sending email. Add `--send` only to request a real test email.

## Idempotency lock contention

When Redis declines `SET NX`, the request does not acquire a local lock. The
dependency checks for a finalized response to replay; otherwise it returns HTTP
409. In-memory lock fallback is used only when Redis is unavailable or disabled.
