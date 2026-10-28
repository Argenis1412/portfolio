# Backend-Focused Portfolio

[![Backend CI](https://github.com/Argenis1412/portfolio/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Argenis1412/portfolio/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/Argenis1412/portfolio/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/Argenis1412/portfolio/actions/workflows/frontend-ci.yml)

Argenis Lopez's portfolio: projects, engineering case studies, professional
experience, and contact. React consumes a FastAPI API backed by checked-in JSON.
Contact processing uses Redis for shared protection and queued Resend delivery,
with explicit fallback and retry limits.

[Portfolio](https://argenisbackend.com) · [API health](https://api.argenisbackend.com/health)

The [v1.9.2 release](CHANGELOG.md) is complete and tagged as `v1.9.2`.
Published services may run different commits; deployment and capacity checks are
tracked in the [operations runbook](docs/architecture/production-operations.md).

## Stack and documentation

| Area | Implementation and guide |
|---|---|
| [Frontend](frontend/README.md) | React 19, TypeScript, Vite, TanStack Query, Tailwind CSS 4, Framer Motion, Lucide; Vitest and Playwright. Includes the visual system. |
| [Backend](backend/README.md) | Python 3.12, FastAPI, JSON content, Redis Streams, Resend; pytest, Ruff, mypy. |
| [Infrastructure](infrastructure/README.md) | Terraform-managed Koyeb service; Vercel frontend configuration. |
| [Architecture](ARCHITECTURE.md) | Request/data flows, boundaries, caching, and delivery trade-offs. |
| [Observability](docs/architecture/observability.md) | Logs, metrics, optional tracing, and local monitoring. |
| [Benchmarks](benchmarks/README.md) | Retained experiment artifacts and measurement limits; [configured targets](docs/architecture/SLO_DEFINITIONS.md). |

`infrastructure/` contains Terraform. `infra/monitoring/` contains Prometheus and
Grafana configuration mounted by Docker Compose.

## Local development

Use Bash with Python 3.12 and Node.js/npm. CI uses Python 3.12 and Node.js 20.
From the repository root:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt -r requirements-dev.txt
cp -n ../.env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

Open [local API docs](http://localhost:8000/docs). Without Redis, contact protection
uses memory and delivery uses background tasks. Without a Resend API key, local
delivery uses the console adapter. No SQL setup or migrations are required.

In another terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

The development API URL defaults to `http://127.0.0.1:8000/api/v1`. See the
[frontend guide](frontend/README.md#development-and-checks) for explicit configuration.

For the API, Redis, Prometheus, Grafana, and Jaeger, from the repository root:

```bash
cp -n .env.example .env
# Set GRAFANA_ADMIN_PASSWORD in .env before starting.
docker compose up --build
```

Compose does not start the frontend. Monitoring URLs and configuration are in the
[observability guide](docs/architecture/observability.md#local-monitoring).

## Contributing

Follow [AGENTS.md](AGENTS.md) for scope, authorship, and required checks. Component
guides document their validation commands. Documentation-only work needs claim,
link, and path checks; application behavior changes require tests.

## Author and license

**Argenis Lopez** · [GitHub](https://github.com/Argenis1412) ·
[LinkedIn](https://www.linkedin.com/in/argenis1412/) · [MIT License](LICENSE)
