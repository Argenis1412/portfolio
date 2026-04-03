# 🏛️ Graphite & Bronze: Backend-Focused Full-Stack System

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](LICENSE)
[![Backend CI](https://github.com/Argenis1412/portfolio/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Argenis1412/portfolio/actions)
[![Frontend CI](https://github.com/Argenis1412/portfolio/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/Argenis1412/portfolio/actions)
[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)

![Portfolio Preview](docs/assets/preview.png)

## 🌐 Live Demo
**Frontend:** [portfolio-argenis1412.vercel.app](https://portfolio-argenis1412s-projects.vercel.app) · **API Docs:** [Swagger UI](https://selected-fionna-argenis1412-58caae17.koyeb.app/docs)

---

## ⚡ TL;DR
A **production-grade backend system** disguised as a portfolio. Not a CRUD demo — a system built to simulate real-world backend challenges:

- ✅ **FastAPI + Clean Architecture** — framework-independent domain logic
- ✅ **React 19 + TanStack Query** — Strict API Consumer pattern
- ✅ **Observability stack** — Sentry + Prometheus + OpenTelemetry
- ✅ **CI/CD with quality gates** — 80% coverage threshold, Docker builds
- ✅ **Multi-layer anti-abuse** — Honeypot + Rate Limiting + 30-min persistent deduplication

---

## 💡 Why This Project Stands Out

Most portfolios show UI. This one demonstrates **production backend thinking**:

| What | Why It Matters |
|---|---|
| **Clean Architecture** | Domain logic is framework-independent — portable to Go, Rust, or any other stack |
| **Strict Consumer Pattern** | Frontend treats backend as a black-box API — real decoupling, not just a buzzword |
| **Persistent Anti-Spam** | Deduplication survives server restarts — state-aware, not in-memory-fragile |
| **80% Coverage Gate** | CI pipeline automatically rejects code that lowers coverage |
| **Observability** | Sentry + Prometheus metrics + OpenTelemetry tracing — knows how to operate systems |

---

## 🔄 Evolution: How This System Grew

This project didn't start production-ready. It evolved:

| Version | State | Result |
|---|---|---|
| **v0** | JSON file persistence | Simple, fast to build |
| **v1** | Migrated to **SQLModel + Alembic** | Persistence, scalability, testability |
| **v2** | Added persistent anti-spam + observability | Production-grade resilience |

The migration from JSON → SQL was a deliberate architectural decision: structured migrations, typed models, and a clear path to PostgreSQL with a single `DATABASE_URL` change.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI · Pydantic V2 · structlog · slowapi · **Sentry** |
| **Frontend** | React 19 · TypeScript · Vite · TanStack Query · Tailwind CSS v4 · **Sentry** · Framer Motion |
| **Testing** | Pytest · Vitest + Testing Library |
| **CI/CD** | GitHub Actions (Lint + Test + Docker Build on every push) |
| **Data** | SQLite with **SQLModel** & **Alembic** migrations |
| **Deployment** | Koyeb (Backend via Dockerfile) · Vercel (Frontend) |

---

## 🧠 Engineering Highlights

### 1. Strict Consumer Pattern
Frontend treats backend as a **black-box API**. Contracts are versioned, ensuring either layer can be scaled or rewritten (e.g., to Go/Rust) independently.

### 2. Language-Agnostic Core
Business logic (Use Cases) is isolated from infrastructure (Adapters). The domain is pure Python, making it portable and easy to migrate to other frameworks or languages.

### 3. Automated Quality Gate
- **Husky + lint-staged**: Impossible to commit code that fails linting.
- **CI/CD**: 80% coverage threshold enforced on every push — no exceptions.
- **Dockerized Builds**: Verified in CI, not just locally.

### 4. Observability
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

> The database migrations run automatically on every Docker deployment via the `CMD` in `Dockerfile`.

---

## 🧪 Tests

```bash
# Backend — with coverage
cd backend && pytest --cov=app --cov-report=html

# Frontend
cd frontend && npm run test
```

Key tests that go beyond coverage numbers:
- Duplicate messages are **blocked even after server restart** (persistent deduplication test)
- Rate limiting correctly rejects after threshold
- Honeypot inputs silently drop bot submissions

---

## 🗺️ Roadmap: Next Big Step

- **🚀 Transactional Core**: Financial ledger with payments, interest logic, ACID compliance
- **🔐 Advanced Auth**: JWT/OAuth2 for user-specific protected dashboards
- **📊 Real-time Analytics**: WebSocket-based live data endpoint (`/api/v1/analytics`)

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
