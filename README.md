# Backend-Focused Portfolio

[![Backend CI](https://github.com/Argenis1412/portfolio/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Argenis1412/portfolio/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/Argenis1412/portfolio/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/Argenis1412/portfolio/actions/workflows/frontend-ci.yml)

React portfolio with a FastAPI backend, JSON content, Redis Streams, and Resend.
Contact processing includes rate limiting, deduplication, idempotency, bounded
retries, and observable delivery.

[Portfolio](https://argenisbackend.com) · [API health](https://api.argenisbackend.com/health)
Published services may run an earlier release.

**Deployment remains blocked until frontend retirement is complete.** See the
[remaining consumers](CHANGELOG.md#frontend-deployment-dependency) and
[operations runbook](docs/architecture/production-operations.md). Docker image
verification and a deployment-sized load test remain pending.

## Stack and layout

| Path | Purpose |
|---|---|
| `backend/` | Python 3.12, FastAPI, JSON content, Redis, Resend; pytest, Ruff, mypy. |
| `frontend/` | React 19, TypeScript, Vite, TanStack Query, Tailwind CSS 4, Framer Motion; Vitest, Playwright. |
| `infrastructure/` | Terraform and Koyeb. |
| `infra/monitoring/` | Prometheus, Grafana, and alert configuration. |
| `docs/`, `benchmarks/` | Architecture, operations, incidents, and historical measurements. |

## Local development

Bash commands for Ubuntu 26.04.1 LTS. Install Python 3.12 with venv support,
Node.js/npm, and optionally Docker with Compose. The backend targets Python 3.12;
use it explicitly rather than assuming the system Python matches.

From the repository root:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt -r requirements-dev.txt
cp -n ../.env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

API docs: [localhost:8000/docs](http://localhost:8000/docs) (disabled in production).
Without Redis, local contact processing uses memory and background tasks. Without
Resend credentials, the console adapter logs delivery instead of sending email.

In another terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

For the API, Redis, and monitoring stack, from the repository root:

```bash
cp -n .env.example .env
# Set GRAFANA_ADMIN_PASSWORD in .env before starting.
docker compose up --build
```

Compose does not start the frontend. See the [backend](backend/README.md) and
[frontend](frontend/README.md) guides for configuration and architecture.

## Required checks before a commit

Backend, from the repository root:

```bash
cd backend
source .venv/bin/activate
python -m ruff check .
python -m ruff format --check .
python -m mypy --config-file pyproject.toml
python -m pytest
```

Frontend, in another terminal from the repository root:

```bash
cd frontend
npm run lint
npx tsc -b
npm run test -- --run
```

Pytest enforces 80% coverage. Review public content snapshot changes deliberately.
Documentation-only changes do not require application tests.

## References

[Architecture](ARCHITECTURE.md) · [Engineering playbook](ENGINEERING_PLAYBOOK.md) ·
[Failure model](docs/architecture/FAILURE_MODEL.md) ·
[SLO targets](docs/architecture/SLO_DEFINITIONS.md) · [Changelog](CHANGELOG.md)

## Author and license

**Argenis Lopez** · [GitHub](https://github.com/Argenis1412) ·
[LinkedIn](https://www.linkedin.com/in/argenis1412/) · [MIT License](LICENSE)
