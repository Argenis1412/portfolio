# Backend-Focused Portfolio

[![Backend CI](https://github.com/Argenis1412/portfolio/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Argenis1412/portfolio/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/Argenis1412/portfolio/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/Argenis1412/portfolio/actions/workflows/frontend-ci.yml)

A React portfolio backed by FastAPI, JSON content, Redis Streams, and Resend.
The backend emphasizes explicit failure handling, contact protection, and
observable delivery rather than simulated infrastructure behavior.

Published links: [Frontend](https://argenisbackend.com) ·
[API health](https://api.argenisbackend.com/health). These links may run an earlier
release; this README describes the cleanup branch.

## Branch status

**Do not merge or deploy the backend cleanup yet.** The frontend still calls
retired Chaos endpoints and consumes removed synthetic summary fields. Its
retirement work must be completed before deploying the combined change. See the
[remaining consumers](CHANGELOG.md#frontend-deployment-dependency).

SQL adapters and simulation endpoints have been removed from the backend.
Existing production databases, tables, volumes, Terraform resources, and secret
identities have not been removed or renamed. Portfolio JSON claims about Chaos
and their snapshots still require a separate review.

## Current backend behavior

| Area | Behavior and limits |
|---|---|
| Portfolio content | Memory-cached files in `backend/data/`; no SQL queries, migrations, or seed step. Content responses support ETag/304 caching. |
| Contact protection | Honeypots, scoring, Redis-backed deduplication, and email/IP/fingerprint rate limits. Scoring flags messages rather than dropping them. |
| Idempotency | Optional `Idempotency-Key` or legacy `X-Idempotency-Key`; completed responses are replayed, concurrent requests receive 409. Redis contention does not acquire a memory lock. |
| Delivery | The API lifespan owns the Redis Streams consumer. Docker runs one Uvicorn process. Resend failures have bounded retries and a dead-letter queue. HTTP acceptance does not confirm inbox delivery. |
| Redis outage | In-memory idempotency, deduplication, and contact rate-limit fallback provide protection within one process. State is not shared across replicas and is lost on restart. Queue failure falls back to background delivery without automatic retries. |
| Health | `/live` reports process liveness. `/health` checks JSON files and reports email configuration; it does not test Redis or Resend connectivity. A degraded result still uses HTTP 200. |
| Observability | Prometheus HTTP/worker metrics, optional Sentry and OpenTelemetry. `/metrics` requires Basic Auth in production; summary metrics belong to each API process. |

The [backend guide](backend/README.md) is the reference for API routes,
configuration, retry limits, and development checks. The
[operations runbook](docs/architecture/production-operations.md) covers deployment
prerequisites, triage, and recovery.

## Stack and layout

| Path | Purpose |
|---|---|
| `backend/` | Python 3.12, FastAPI, Pydantic, structlog, Redis, Resend; pytest, Ruff, mypy. |
| `frontend/` | React 19, TypeScript, Vite, TanStack Query, Tailwind CSS 4, Framer Motion; Vitest and Playwright. |
| `infrastructure/` | Terraform-managed Koyeb configuration. GitHub Actions supplies secret values. |
| `infra/monitoring/` | Local Prometheus and Grafana configuration. |
| `docs/` | Architecture, operating guidance, and historical incident reports. |
| `benchmarks/` | Load scripts and version-specific measurement artifacts. |

## Local development

Use Python 3.12. From `backend/`, create and activate a virtual environment, install
both requirements files, and copy the shared environment example:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
python -m pip install -r requirements.txt -r requirements-dev.txt
cp ../.env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

PowerShell copy command: `Copy-Item ../.env.example .env`. Local API documentation
is at `/docs`; it is disabled in production. Without Redis, contact protection and
delivery use local fallbacks. Without Resend credentials, the local console
adapter does not send real email.

For the frontend, use a separate terminal in `frontend/`:

```bash
npm ci
npm run dev
```

See the [frontend guide](frontend/README.md) for its architecture and configuration.
For the Compose stack, copy `.env.example` to the root `.env`, set
`GRAFANA_ADMIN_PASSWORD`, configure email if needed, and run
`docker compose up --build` from the repository root. The current Docker image
build still requires verification with a running daemon.

## Required checks before a commit

From `backend/`, with its virtual environment active:

```bash
python -m ruff check .
python -m ruff format --check .
python -m mypy --config-file pyproject.toml
python -m pytest
```

From `frontend/`:

```bash
npm run lint
npx tsc -b
npm run test -- --run
```

Pytest enforces 80% coverage. Public content snapshots must be reviewed
deliberately when changing JSON or response mappings. The configured CI workflow
filters determine when jobs run; a badge is not evidence that this branch or the
current Docker image passed. Capacity under the single-process configuration
still needs a deployment-sized load test.

## Design history and evidence

[ARCHITECTURE](ARCHITECTURE.md) describes current backend boundaries and indexes
current, retired, and deferred decisions. The
[engineering playbook](ENGINEERING_PLAYBOOK.md) defines development and review rules.
[CHANGELOG](CHANGELOG.md) retains release history and production incidents.
The [failure model](docs/architecture/FAILURE_MODEL.md), resilience policy, JSON
read decision, SLO targets, observability/logging, security, CORS, and HTTP caching
guides distinguish current behavior from historical evidence. Incident reports,
case studies, and Chaos/IaC decisions preserve their version context and stable
links. Content/release guidance and the frontend refinement plan remain for review.

The [SLO definitions](docs/architecture/SLO_DEFINITIONS.md) state targets; the
[recorded benchmark](benchmarks/results/02c08d3/summary.md) is historical evidence,
not a measurement of this cleanup branch. No new load test or live production
verification is implied by this documentation update.

## Author and license

**Argenis Lopez** · [GitHub](https://github.com/Argenis1412) ·
[LinkedIn](https://www.linkedin.com/in/argenis1412/).
Licensed under the [MIT License](LICENSE).
