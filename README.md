# 🏛️ Backend-Focused Full-Stack System

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](LICENSE)
[![Backend CI](https://github.com/Argenis1412/portfolio/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Argenis1412/portfolio/actions)
[![Frontend CI](https://github.com/Argenis1412/portfolio/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/Argenis1412/portfolio/actions)
[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)

## 🌐 Live Demo
**Frontend:** [argenisbackend.com](https://argenisbackend.com) · **API Status:** [Healthy (JSON)](https://api.argenisbackend.com/health)

---

## ⚡ TL;DR
A **production-grade backend system** disguised as a portfolio. Not a CRUD demo — a system built to simulate real-world backend challenges:

- ✅ **JSON-First Read Path** — eliminates Database cold-starts for portfolio data
- ✅ **React 19 + TanStack Query** — Optimized caching (15min) and zero-refetch on mount
- ✅ **HTTP Caching (ETags)** — 304 Not Modified support for zero-bandwidth revalidation
- ✅ **Observability stack** — Sentry + Prometheus + OpenTelemetry
- ✅ **CI/CD with quality gates** — 80% coverage threshold, ruff/mypy checks
- ✅ **Multi-layer anti-abuse** — Honeypot + Spam Scoring + Redis-backed deduplication + Rate Limiting (10/day per email, 30/hour per IP)

---

## 💡 Why This Project Stands Out

Most portfolios show UI. This one demonstrates **production backend thinking**:

| What | Why It Matters |
|---|---|
| **JSON-First Arch** | Eliminates DB dependency for reads. P95 latency <50ms. |
| **ETag Support** | Browser caching with 304 status. Zero-payload on repeat visits. |
| **Protected metrics** | Prometheus endpoint secured with Basic Auth in production. |
| **80% Coverage Gate** | CI pipeline automatically rejects code that lowers coverage. |
| **Resilient Core** | Fallback mechanisms for Redis/External API failures. |

---

## 🔄 Evolution: How This System Grew

This project didn't start production-ready. It evolved through real production incidents:

| Version | Milestone | Key Change |
|---|---|---|
| **v1.0.0** | Initial Release | FastAPI + Clean Architecture + JSON persistence |
| **v1.1.0** | CORS Dynamic Support | Regex-based CORS for Vercel preview URLs (ADR-06) |
| **v1.2.0** | Observability Stack | Prometheus + Sentry + OpenTelemetry (ADR-04, ADR-09) |
| **v1.3.0** | Persistent State | Redis-backed rate limiting + PostgreSQL (ADR-11) — fixed INC-001 |
| **v1.3.1** | Security Hardening | `TRUSTED_PROXY_DEPTH` validation + PII masking |
| **v1.4.0** | Production Deploy | Custom domain + Resend email + CSP/CORS sync (ADR-15.3) — fixed INC-004 |
| **v1.4.1** | Cold Start Fix | JSON-First Read Path (ADR-05) — fixed INC-002 |
| **v1.4.2** | Observability Infra | `trace_id` propagation + MetricsSparkline + enriched contact response |
| **v1.5.0** | Chaos Engineering | Deterministic chaos presets + stateful decision engine (ADR-14) |
| **v1.5.1** | Honest Telemetry | Synthetic vs. real labels + confidence indicator (ADR-13) |
| **v1.6.0** | Build Standardization | Modular API layer + root-context Dockerfile (ADR-15.2) — fixed INC-005 |

Each version was driven by real production needs, not speculative features. See [CHANGELOG.md](CHANGELOG.md) for full details.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI · Pydantic V2 · structlog · slowapi · **Sentry** |
| **Frontend** | React 19 · TypeScript · Vite · TanStack Query · Tailwind CSS v4 · **Sentry** · Framer Motion |
| **Testing** | Pytest (Resilience + Perf) · Vitest + Testing Library |
| **CI/CD** | GitHub Actions (Lint + Test + Build) |
| **Data** | **JSON/Memory** (Read Path) · **PostgreSQL** (DB) · **Redis** (Upstash) |
| **Deployment** | Koyeb (Backend via Dockerfile) · Vercel (Frontend) |

---

## 🧠 Engineering Highlights

### 1. JSON-First & Scalable Persistence
While PostgreSQL is used for persistence, the **primary read path** for portfolio sections (About, Stack, Projects) uses a memory-cached JSON adapter. This ensures instant loads even on server cold-starts, while the `RepositorioSQL` adapter remains available for transactional needs.

### 2. HTTP Caching Strategy
The system implements a manual ETag generation strategy. Every GET response includes an ETag hash of its payload. If the client sends an `If-None-Match` header, the backend returns a **304 Not Modified** with zero body, optimizing bandwidth for returning visitors.

### 3. Automated Quality Gate
- **Static Analysis**: `ruff` for linting/formatting and `mypy` for gradual typing.
- **CI/CD**: 80% coverage threshold enforced on every push — no exceptions.
- **Dockerized Builds**: Verified in CI, not just locally.

### 4. Security & Performance (Hardening)
- **Protected Metrics**: The `/metrics` endpoint is protected via Basic Auth in production.
- **Middleware Optimization**: Minimal body parsing in global middleware to reduce overhead.
- **Distributed State**: Redis-backed rate limiting, idempotency, and contact deduplication for cross-instance coordination.
  - Rate limiting: 10/day per email, 20/min per email, 30/hour per IP + fingerprint
  - Idempotency: `Idempotency-Key` header prevents duplicate submissions
  - Dedup: 30-minute content-hash window via `SpamDedupStore` (Redis → in-memory fallback)
- **ContactGuard**: Dedicated orchestration service isolating all validation rules from the HTTP controller.
- **[Architecture Decision Record: Security Hardening](docs/architecture/security-hardening.md)**

### 5. Observability
- **Sentry**: Error tracking and performance tracing (Full-stack).
- **Prometheus**: Metrics endpoint at `/metrics` (protected with Basic Auth in production).
- **OpenTelemetry**: Distributed tracing for request lifecycles, enriched with `trace_id` and `request_id` correlation.
- **[Architecture Decision Record: Observability](docs/architecture/observability.md)**

#### 📊 Operational Chaos Control & Decision Engine
- **Stateful Decision Engine**: Implements hysteresis-based threshold monitoring (`NORMAL` → `DEGRADED` → `STABLE`) via `useDecisionEngine.ts`.
- **Deterministic Chaos Presets**: Global simulation modes (`MILD`, `STRESS`, `FAILURE`) injected via headers for reproducible failure analysis.
- **Honest Telemetry Overlay**: Chaos actions immediately project a synthetic P95 sample, then reconcile with backend polling. The UI labels the source (`real` vs `synthetic`) and exposes a confidence indicator to avoid pretending projections are raw backend facts.
- **Metrics Sparkline**: Short-window P95 visualization with baseline averaging, lighter incident markers, and a dashed synthetic segment distinct from real backend samples.
- **Circuit Breaker / Degraded Mode**: Automatic shift to `async` fallback or `serving` cache mode during infrastructure saturation.
- **Adaptive Chaos Strategy**: Presets now influence retry posture, cache TTL expectations, and lifecycle presentation instead of only toggling a failure banner.
- **Operational Documentation**: 
  - **Case Study #0042**: Detailed post-mortem analysis of archived Redis leaks.
  - **Architecture Trade-offs**: Multi-language evidence showing compromises (Sync vs. Async, Latency vs. Consistency).
- **Chaos Playground**: Full-stack experiment console with trace correlation and multi-language logging.
- **[Architecture Decision Record: Logging & Degradation](docs/architecture/LOGGING_AND_DEGRADATION.md)**

#### 🧱 Portfolio Narrative Structure
- **Projects** now render as compact backend case studies with `Problem`, `Constraint`, `Decision`, `Trade-off`, `Impact`, and `Stack` sections sourced from `descricao_completa`.
- **Journey / Experience** is no longer a CV tabset. It is a vertical engineering timeline organized around decisions, failures, learning, and operational impact.

#### 📊 Production Incident Track Record
*5 real production incidents documented with post-mortems:*

| Incident | Failure | Detection | Resolution |
|---|---|---|---|
| **INC-001** | Rate limiter silently disabled (in-memory reset) | Manual discovery | Redis-backed rate limiting (v1.3.0) |
| **INC-002** | Cold start latency 280-400ms despite keep-alive | Metrics gap | JSON-First Read Path (v1.4.1) |
| **INC-003** | Chaos Playground crash on DB unavailability | Manual testing | Fail-silent persistence (v1.4.x) |
| **INC-004** | CSP blocking all API calls in production | Browser console | CSP/CORS synchronization (v1.4.0) |
| **INC-005** | Docker build context mismatch across environments | CI/CD failure | Root-context standardization (v1.6.0) |

See [FAILURE_MODEL.md](docs/architecture/FAILURE_MODEL.md) for full degradation behaviors and governing ADRs.

#### 📊 Performance Baseline (SLO Targets)
*From [SLO_DEFINITIONS.md](docs/architecture/SLO_DEFINITIONS.md) — source: ENGINEERING_PLAYBOOK.md section 11:*
- **Portfolio Data** (`/about`, `/projects`, `/stack`): P95 < 50ms ✅
- **Contact Endpoint** (`/contact`): P95 < 200ms ✅
- **Health Check** (`/health`): P99 < 20ms ✅
- **Error Rate**: < 0.5% (5xx over 15-min window) ✅ 

### 5. Performance & DX
- **Predictive Prefetching**: Data pre-loaded on hover for instant transitions.
- **Background Sync**: Silent refresh on window focus.
- **Scalable i18n**: JSON-driven translations (PT/EN/ES) with zero-recompile.

---

## 🚀 Quick Start

### Using Docker (Recommended)
```bash
git clone https://github.com/Argenis1412/portfolio.git
cd portfolio
docker-compose up --build
```

### Manual Setup
```bash
# Backend
cd backend
py -3.12 -m venv .venv && .venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m alembic upgrade head
uvicorn app.principal:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install && npm run dev
```

> Run database migrations as part of deploy/release automation, not on every Koyeb application boot.
> 
> **Note**: Interactive documentation (Swagger/ReDoc) is disabled in production for security. To view the API contract, run the project locally in `desenvolvimento` mode and access `localhost:8000/docs`.

---

## 🧪 Tests

```bash
# Backend — with coverage
cd backend && pytest --cov=app --cov-config=.coveragerc --cov-report=html

# Frontend
cd frontend && npm run test
```

Key tests that demonstrate production-level reliability:
- ✅ **Persistent Anti-Spam**: Duplicate messages are blocked even after server restart (Redis → in-memory fallback).
- ✅ **Distributed Rate Limiting**: Limits enforced per email, per IP, and per browser fingerprint.
- ✅ **Honeypot Resilience**: Silent drop of bot submissions without revealing protection mechanisms.
- ✅ **Clean Architecture Boundary**: Automated checks — domain logic has zero dependencies on infrastructure.
- ✅ **Redis Failure Fallback**: `IdempotencyStore` and `SpamDedupStore` both fall back to memory if Redis is unreachable.
- ✅ **Concurrent Idempotency**: A second in-flight request with the same key receives HTTP 409 Conflict.

---

## 🗺️ Roadmap: Next Big Step

- **🚀 Advanced Simulation**: Transactional flow for a mock "Financial Ledger" (ACID compliance testing)
- **🔐 Identity Research**: Role-Based Access Control (RBAC) for administrative panels
- **📊 Real-time Monitoring**: Transition from polling to WebSocket-based live dashboard for a "Live Operations Console" experience.

---

## 📁 Repository Structure
```
portfolio/
├── backend/              # FastAPI backend (Clean Architecture)
├── frontend/             # React 19 + TypeScript frontend
├── docs/
│   └── architecture/
│       ├── SLO_DEFINITIONS.md    # Per-endpoint SLOs with measurement methods
│       └── FAILURE_MODEL.md      # Production incident failure model (INC-001–INC-005)
├── .github/              # GitHub Actions CI/CD workflows
├── ARCHITECTURE.md       # ADR-01 through ADR-16
├── CHANGELOG.md          # Release history + 5 production incidents
├── ENGINEERING_PLAYBOOK.md  # SLOs, standards, incident protocol
└── docker-compose.yml
```

For more details: [`backend/README.md`](backend/README.md) · [`frontend/README.md`](frontend/README.md)

---

## 👨‍💻 Author

**Argenis Lopez** — Backend Developer · [LinkedIn](https://www.linkedin.com/in/argenis1412/) · [GitHub](https://github.com/Argenis1412)

---
*Licensed under the [MIT License](LICENSE).*
