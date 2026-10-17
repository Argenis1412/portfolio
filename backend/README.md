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
and background tasks; production requires Redis.

## Configuration

| Variables | Purpose |
|---|---|
| `APP_NAME`, `ENVIRONMENT` | Service name and environment; use `production` in production. |
| `ALLOWED_ORIGINS`, `REGEX_ALLOWED_ORIGINS` | Browser CORS origins and optional origin regex. |
| `REDIS_URL` | Shared rate limiting, idempotency, deduplication, and contact queue. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_TO_EMAIL` | Email delivery credentials and addresses. |
| `METRICS_BASIC_AUTH_USERNAME`, `METRICS_BASIC_AUTH_PASSWORD` | Required protection for `/metrics` in production. |
| `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `OTLP_ENDPOINT` | Optional error tracking and tracing. |
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
`GRAFANA_ADMIN_PASSWORD`. Compose passes that file to the API and worker, overrides
their environment to `development`, and points them to the internal Redis service.

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
consumes contact jobs. Docker Compose currently also defines a standalone worker;
the worker cleanup will consolidate execution.

```bash
ruff check .
ruff format --check .
mypy app/core app/use_cases app/controllers app/adapters --ignore-missing-imports --explicit-package-bases
pytest
```

Pytest enforces 80% coverage and mocks email delivery. Content snapshots in
`tests/snapshots/content.json` protect the public JSON contract; review snapshot
updates deliberately when changing portfolio content or response mappings.

`python scripts/check_resend.py` reports configuration presence without printing
credentials or sending email. Add `--send` only to request a real test email.
