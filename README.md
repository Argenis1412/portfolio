# 🏛️ Graphite & Bronze: Backend-Focused Full-Stack System

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](LICENSE)
[![Backend CI](https://github.com/Argenis1412/portfolio/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Argenis1412/portfolio/actions)
[![Frontend CI](https://github.com/Argenis1412/portfolio/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/Argenis1412/portfolio/actions)
[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)

## 🌐 Live Demo
**Frontend:** [argenisbackend.com](https://argenisbackend.com) · **API Status:** [Healthy (JSON)](https://api.argenisbackend.com/saude)

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

This project didn't start production-ready. It evolved:

| Version | State | Result |
|---|---|---|
| **v0** | JSON file persistence | Simple, fast to build |
| **v1** | Migrated to **SQLModel + Alembic** | Persistence, scalability, testability |
| **v2** | Added persistent anti-spam + observability | Production-grade resilience |
| **v3** | High-security (Middlewares) + Scalable Persistence | Redis (Upstash) and PostgreSQL (Koyeb DB) |

The migration from JSON → SQLite → PostgreSQL was a deliberate engineering journey: proving that a well-designed Clean Architecture can swap data adapters without affecting business logic.

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
- **Prometheus**: Metrics endpoint at `/metrics`.
- **OpenTelemetry**: Distributed tracing for request lifecycles.
- **[Architecture Decision Record: Observability](docs/architecture/observability.md)**

#### 📊 Performance Baseline
*Based on production monitoring:*
- **P95 Latency**: <150ms 
- **Error Rate**: <0.1% 
- **LCP (Full load)**: <1.2s 

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
- **📊 Real-time Monitoring**: WebSocket-based live dashboard for `/metrics`

---

## 📁 Repository Structure
```
portfolio/
├── backend/          # FastAPI backend (Clean Architecture)
├── frontend/         # React 19 + TypeScript frontend
├── .github/          # GitHub Actions CI/CD workflows
└── docker-compose.yml
```

For more details: [`backend/README.md`](backend/README.md) · [`frontend/README.md`](frontend/README.md)

---

## 👨‍💻 Author

**Argenis Lopez** — Backend Developer · [LinkedIn](https://www.linkedin.com/in/argenis1412/) · [GitHub](https://github.com/Argenis1412)

---
*Licensed under the [MIT License](LICENSE).*
