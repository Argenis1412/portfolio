# 🏛️ Architecture & Technical Decisions

This document details the reasoning behind the architectural choices found in this repository. Since this is a personal portfolio showcasing engineering practices, it serves as a lightweight Architecture Decision Record (ADR).

## 1. Clean Architecture in the Backend
**Why?** The backend is structured using Clean Architecture (Controllers -> Use Cases -> Entities -> Adapters). While a "simple portfolio" might not strictly need it, demonstrating language-agnostic boundary isolation shows scaling potential and separation of concerns.

## 2. Decoupled Frontend and Strict API Consumer
**Why?** The React frontend never connects directly to a database, and the FastAPI backend does not serve HTML. Keeping these completely separate ensures proper CORS enforcement, prevents accidental tightly-coupled logic, and mirrors real-world enterprise architectures where mobile devices could consume the same backend.

## 3. Dynamic Database Seeding
**Decision**: In production, the SQLite database is NOT committed to Git.
**Why?** Committing databases is an anti-pattern. Instead, static profile data is loaded dynamically on startup via Alembic (`upgrade head`) and a python seeder (`python scripts/migrar_dados.py`). This prevents git bloating and ensures schema migrations are handled correctly.

## 4. Observability and Public Metrics
**Decision**: Exposing Prometheus metrics at `/metrics` publicly without authentication.
**Why?** Normally, exposing infrastructure metrics could be a DoS vector or leak competitive usage data. Here, the metrics are intentionally left public so reviewers and automated tools can see the live stack's health, throughput, and latencies without needing credentials. No PII is present.

## 5. Security Regex over Allow-Lists
**Decision**: The CORS Policy uses a regex rule (`^https://portfolio.*-argenis1412s-projects\.vercel\.app$`) instead of exact strings or `*`.
**Why?** Vercel creates dynamic preview domains per PR. Doing hardcoded allowed lists blocks PR testing. Using a wide open `*` disables secure credential-passing. The precise regex allows only our generated subdomains to seamlessly interact with the API, blocking impersonation from other `*.vercel.app` sites.

## 6. Language for Health Checks
**Decision**: Keeping `/saude` as the endpoint instead of `/health`.
**Why?** Although the architecture documentation has migrated to English to target a wider audience, the domain core model started in Portuguese. To avoid breaking monitoring probes and infrastructure expectations already tracking `/saude`, the endpoint name was consciously retained.

## 7. Frontend State Architecture
**Decision**: React + TanStack Query instead of Redux/Zustand for most data mapping.
**Why?** A portfolio is a read-heavy application. TanStack Query treats remote data precisely as it is — a cache of server state. Local state is kept minimal, leaving data fetching, prefetching on hover, and cache invalidation entirely to the asynchronous fetching layer.

## 8. Full-Stack Error Tracking (Sentry)
**Decision**: Using Sentry for both React and FastAPI.
**Why?** Observability is more than just metrics; it's about context. Sentry provides the "why" behind failures, capturing breadcrumbs, request metadata, and stack traces that Prometheus metrics (`/metrics`) can't show. By using `VITE_SENTRY_DSN` on the frontend and `SENTRY_DSN` on the backend, we achieve unified error correlation across the entire user journey.

## 9. Security Hardening (Defense-in-Depth)
**Decision**: Implementing `SegurancaHeadersMiddleware` and `GZipMiddleware`.
**Why?** Browsers rely on specific headers (HSTS, NoSniff, X-Frame-Options) to enforce security policies. While the frontend had these in Vercel, the backend API was unprotected if accessed directly. Adding these headers at the middleware level ensures that every response is hardened by default. Additionally, GZip compression for payloads >1KB significantly improves UI performance on low-bandwidth networks.

## 10. External Storage for Distributed State
**Decision**: Migrating Rate Limiting and Persistence from local Memory/SQLite to Redis and PostgreSQL for production.
**Why?** In "ephemeral" cloud environments like Koyeb, local file storage (SQLite) and in-memory caches (Rate limiting counters) are wiped on every container restart. By decoupling state into managed PostgreSQL (via `asyncpg`) and Redis (via `Upstash`), the application achieves true horizontal scalability and persistent antispam protection across multiple replicas.
