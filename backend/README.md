# Portfolio Backend

Python 3.12 and FastAPI serve memory-cached JSON from `data/`. Contact messages
use Redis Streams and Resend, with background delivery when the queue is
unavailable. No SQL setup, migrations, or seeding are required.

## Run locally

Bash on Ubuntu 26.04.1 LTS; Python 3.12 with venv support is required.
From the repository root:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt -r requirements-dev.txt
cp -n ../.env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

Local API docs: [localhost:8000/docs](http://localhost:8000/docs). Without Redis,
contact protection uses memory and delivery uses background tasks. Without Resend
credentials, the console adapter logs delivery without sending email.
For Docker Compose and frontend commands, see the [root guide](../README.md#local-development).

## Configuration

Use the shared [environment example](../.env.example); see
[settings](app/settings.py) for defaults and validation.

| Variables | Purpose |
|---|---|
| `APP_NAME`, `ENVIRONMENT` | Service name and environment: `local`, `development`, `testing`, `staging`, or `production`. |
| `ALLOWED_ORIGINS`, `REGEX_ALLOWED_ORIGINS` | CORS origins and optional regex. |
| `REDIS_URL`, `WORKER_ENABLED` | Shared protection and contact queue; the in-process consumer defaults to enabled. |
| `REDIS_SOCKET_TIMEOUT_SECONDS`, `REDIS_CONNECT_TIMEOUT_SECONDS` | Nonblocking Redis timeouts, 5 seconds each by default. Blocking worker reads use 60/10 seconds. |
| `RATE_LIMIT_REDIS_TIMEOUT_SECONDS` | Rate limiter timeout, default 1 second; finite and positive. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_TO_EMAIL` | Email provider configuration; sender has a default. |
| `METRICS_BASIC_AUTH_USERNAME`, `METRICS_BASIC_AUTH_PASSWORD` | Protect `/metrics` in production. |
| `OTEL_ENABLED`, `OTLP_ENDPOINT`, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE` | Tracing and error tracking; OpenTelemetry defaults to enabled. |
| `TRUSTED_PROXY_DEPTH`, `TRUSTED_PROXY_IPS` | Client IP extraction behind trusted proxies. |

Production requires Redis, metrics authentication, and nonblank Resend API key
and recipient. Interactive API docs are disabled. Use English configuration keys;
legacy `DATABASE_URL` and `DB_*` settings are ignored. Existing environments using
`AMBIENTE`, `NOME_APP`, `ORIGENS_PERMITIDAS`, or `REGEX_ORIGENS_PERMITIDAS` must
migrate to the corresponding English keys without changing credential values.
Verify the production environment value before deployment; see the
[operations runbook](../docs/architecture/production-operations.md).

## API

| Endpoint | Behavior |
|---|---|
| `GET /live` | Process liveness. |
| `GET /health` | JSON file checks, email configuration, version, and uptime. |
| `GET /api/v1/{about,projects,stack,experiences,formation,philosophy}` | Portfolio content with ETag caching. |
| `GET /api/v1/projects/{id}` | Project details; 404 for an unknown ID. |
| `POST /api/v1/contact` | Validated contact submission with protection and optional idempotency. |
| `GET /api/v1/metrics/summary` | Observed P95, request/error counts, uptime, and derived status. |
| `GET /metrics` | Prometheus HTTP and worker metrics; Basic Auth in production. |

`/health` returns HTTP 200 even when degraded. It checks JSON readability, syntax,
and top-level types, not every content field or Redis/Resend connectivity.
Metrics belong to each API process. Simulation endpoints have been retired;
[frontend compatibility remains a deployment prerequisite](../CHANGELOG.md#frontend-deployment-dependency).

## Code and checks

Controllers handle HTTP; use cases retrieve content and submit messages; adapters
implement JSON reads and delivery. `app/core/` holds protection and telemetry.
Docker runs one Uvicorn process with one contact consumer per API instance.
There is no standalone worker command or Compose worker service.

From the repository root, after installing the local requirements:

```bash
cd backend
source .venv/bin/activate
python -m ruff check .
python -m ruff format --check .
python -m mypy --config-file pyproject.toml
python -m pytest
```

Pytest enforces 80% coverage and mocks email delivery. Review changes to
`tests/snapshots/content.json` deliberately. Real-Redis tests skip without
`REDIS_TEST_URL`; use a disposable local database `/15`:

```bash
# From backend/, with its virtual environment active and disposable Redis running:
REDIS_TEST_URL=redis://127.0.0.1:16379/15 python -m pytest
```

Fixtures reject remote hosts, credentials, and other databases. Worker fixtures
flush database `/15`; contact fixtures delete only their unique keys. CI supplies
disposable Redis. `python scripts/check_resend.py` checks configuration without
sending email; `--send` explicitly sends a real test email.

## Reliability limits

- **Contact protection:** validation precedes idempotency reservation. Scoring
  flags spam; filled honeypots are silently discarded. Deduplication and
  email/IP/fingerprint limits still apply.
- **Redis outage:** protection falls back to process-local memory, lost on
  restart and not shared across replicas. Rate limiter errors bypass Redis for
  30 seconds; read-only requests fail open. Its first synchronous attempt can
  still block the event loop. Socket timeouts are not request deadlines.
- **Idempotency:** `Idempotency-Key` or legacy `X-Idempotency-Key` replays completed
  responses; contention returns 409 without acquiring a memory lock. Reservations
  retain their acquisition backend. Tokens and atomic Lua comparisons prevent an
  old owner from releasing or overwriting a successor's record.
- **Cancellation:** acquisition and cleanup are shielded and bounded to 10 seconds
  each; internal tasks are joined. Redis locks use a 30-second TTL; failures can
  leave them until expiry. Processing can overlap after expiry; finalizing an
  absent key cannot recover ownership history. This is not exactly-once delivery.
- **Delivery:** the consumer restarts with backoff and recovers pending jobs.
  Transient provider failures receive up to three retries, unknown failures one,
  and permanent failures none. Jobs older than 15 minutes are not requeued.
  Retry/DLQ publication precedes acknowledgment. A crash after sending but before
  acknowledgment can duplicate email. Background fallback logs failures without
  retrying. HTTP acceptance does not confirm inbox delivery.
- **Deployment:** drain legacy instances before relying on token ownership.
  Managed Redis must permit script loading/execution; local tests do not verify
  production permissions. Docker build verification and a deployment-sized load
  test remain pending.

See the [failure model](../docs/architecture/FAILURE_MODEL.md) and
[operations runbook](../docs/architecture/production-operations.md) for triage,
recovery, worker signals, and deployment prerequisites.
