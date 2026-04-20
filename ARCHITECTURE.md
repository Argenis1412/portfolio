# 🏛️ Architecture & Technical Decisions

This document details the reasoning behind the architectural choices found in this repository. Since this is a personal portfolio showcasing engineering practices, it serves as a lightweight Architecture Decision Record (ADR).

## 1. Clean Architecture in the Backend
**Why?** The backend is structured using Clean Architecture (Controllers -> Use Cases -> Entities -> Adapters). While a "simple portfolio" might not strictly need it, demonstrating language-agnostic boundary isolation shows scaling potential and separation of concerns.

## 2. Decoupled Frontend and Strict API Consumer
**Why?** The React frontend never connects directly to a database, and the FastAPI backend does not serve HTML. Keeping these completely separate ensures proper CORS enforcement, prevents accidental tightly-coupled logic, and mirrors real-world enterprise architectures where mobile devices could consume the same backend.

## 3. Managed Database and One-Off Seeding
**Decision**: In production, the managed PostgreSQL database is not committed to Git and is not reseeded on every boot.
**Why?** Committing databases is an anti-pattern, and reseeding on every Koyeb cold start increases readiness time. Schema migrations should run during deploy/release steps, while `python scripts/migrar_dados.py` should be used as a one-off refresh task only when static SQL data needs to be rebuilt.

## 4. Observability and Protected Metrics
**Decision**: Exposing Prometheus metrics at `/metrics` but requiring Basic Auth in production.
**Why?** While the metrics are intentionally accessible to reviewers, exposing a public `/metrics` endpoint on the open internet (even for a portfolio) is a non-standard practice that could be seen as a security oversight. Adding `METRICS_BASIC_AUTH` ensures that only authorized clients (or reviewers with the provided credentials) can see the live stack's health, throughput, and latencies.

## 5. Performance: JSON-First Read Path
**Decision**: Prioritizing `RepositorioJSON` for all portfolio-related reads (about, projects, stack, etc.) in production.
**Why?** Using a managed PostgreSQL database for static data in a serverless/ephemeral environment adds significant cold-start latency and increases the risk of transient connection failures. By serving the portfolio data directly from memory-cached JSON files (Clean Architecture allows swapping adapters seamlessly), we achieve P95 latencies < 50ms and eliminate PostgreSQL as a single point of failure for the main application view. PostgreSQL remains reserved for transactional or future dynamic needs.

## 6. Security Regex over Allow-Lists
**Decision**: The CORS Policy uses a regex rule (`^https://argenisbackend\.com|https://portfolio.*-argenis1412s-projects\.vercel\.app$`) instead of exact strings or `*`.
**Why?** Vercel creates dynamic preview domains per PR. Doing hardcoded allowed lists blocks PR testing. Using a wide open `*` disables secure credential-passing. The precise regex allows only our generated subdomains to seamlessly interact with the API, blocking impersonation from other `*.vercel.app` sites.

## 7. Language for Health Checks
**Decision**: Keeping `/saude` as the endpoint instead of `/health`.
**Why?** Although the architecture documentation has migrated to English to target a wider audience, the domain core model started in Portuguese. To avoid breaking monitoring probes and infrastructure expectations already tracking `/saude`, the endpoint name was consciously retained.

## 8. Frontend State Architecture
**Decision**: React + TanStack Query instead of Redux/Zustand for most data mapping.
**Why?** A portfolio is a read-heavy application. TanStack Query treats remote data precisely as it is — a cache of server state. Local state is kept minimal, leaving data fetching, prefetching on hover, and cache invalidation entirely to the asynchronous fetching layer.

## 9. Full-Stack Error Tracking (Sentry)
**Decision**: Using Sentry for both React and FastAPI.
**Why?** Observability is more than just metrics; it's about context. Sentry provides the "why" behind failures, capturing breadcrumbs, request metadata, and stack traces that Prometheus metrics (`/metrics`) can't show. By using `VITE_SENTRY_DSN` on the frontend and `SENTRY_DSN` on the backend, we achieve unified error correlation across the entire user journey.

## 10. Security Hardening (Defense-in-Depth)
**Decision**: Implementing `SegurancaHeadersMiddleware` and `GZipMiddleware`.
**Why?** Browsers rely on specific headers (HSTS, NoSniff, X-Frame-Options) to enforce security policies. While the frontend had these in Vercel, the backend API was unprotected if accessed directly. Adding these headers at the middleware level ensures that every response is hardened by default. Additionally, GZip compression for payloads >1KB significantly improves UI performance on low-bandwidth networks.

## 11. External Storage for Distributed State
**Decision**: Migrating Rate Limiting and Persistence from local Memory/SQLite to Redis and PostgreSQL for production.
**Why?** In "ephemeral" cloud environments like Koyeb, local file storage (SQLite) and in-memory caches (Rate limiting counters) are wiped on every container restart. By decoupling state into managed PostgreSQL (recommended: Supabase via `asyncpg`) and Redis (via `Upstash`), the application achieves true horizontal scalability and persistent antispam protection across multiple replicas.

## 12. Future Strategy: Scalability via Multi-Deploy (FastAPI & Go)
**Decision**: A full rewrite of the backend to Go is officially discarded as over-engineering. Instead, any future expansion will follow a **multi-deploy strategy**: keeping Python (FastAPI) for the primary endpoints and expanding with Go only for specific, high-performance microservices.
**Why?** Currently, the system is stable, P95 latency is < 50ms, and error rates are exceptionally low. The only previous penalty was cold starts, which was efficiently resolved with a cron-based keep-alive strategy. The true bottleneck is the hardware limitation of the Koyeb free tier, a constraint that no language change can magically fix.
Migrating entirely to Go simply to gain speed before a real problem exists is an anti-pattern. That approach introduces more infrastructure, more points of failure, and less clarity, all to fix something that is already working perfectly.
If Go is integrated in the future, it will only be under real necessity signals (e.g., CPU constantly saturated, P95 rising under load, or heavy concurrent tasks) following this intelligent workflow:
1.  **Create a minimal Go service** (e.g., isolated deploy) for specific tasks.
2.  **FastAPI acts as the consumer** (`Client -> FastAPI -> Go Service`).
3.  **Measure** the real latency, consumption, and added complexity before deciding to expand further.

## 13. Frontend Observability Enhancements
**Decision**: Enhanced frontend observability with real-time telemetry, failure visibility, and end-to-end traceability.
**Why?** To provide engineers with actionable insights into system behavior, making failure/recovery visible and ensuring strong correlation in logs.
- Added MetricsSparkline component with linear line, threshold lines, and vertical incident markers for real-time P95 latency telemetry.
- Extended useLiveMetrics hook to keep timestamped samples, baseline P95, recent traces, latest event, circuit-breaker and timeout states.
- Rewrote LiveMetricsBento to show delta vs previous, delta vs baseline, failure-model panel, and telemetry timeline.
- Updated Hero sidecar to render real sparkline, circuit state, and latest trace.
- Modified ChaosPlayground to emit trace_id and include richer log fields (retry_triggered, circuit_breaker, timeout_ms).
- Enhanced TraceViewer and LogStream to display both request_id and trace_id for end-to-end correlation.
- Fixed LogStream auto-scroll to stay inside the terminal and removed global window.scrollTo in App.tsx.
- Added missing i18n keys for metrics, failure model, and telemetry legend.
