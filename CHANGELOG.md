# 📊 CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/en/2.0.0/).

---

## [1.4.1] - 2026-04-19

### 🛠️ Enhancements & Reliability

#### ✅ Added
- ✅ **Philosophy & Inspirations**: Implemented a new section showcasing engineering pillars with Clean Architecture backend (JSON data source), accessible card-based UI with adaptive animations, and 100% test coverage.
- ✅ **TraceConsole UI**: Allow continuous payload testing without reloading (`#10`).
- ✅ **Chaos Engineering**: Implement honest chaos playground and enhanced failure metrics.

#### 🚀 Performance
- ✅ **Cold Start Optimization**: Removed `alembic upgrade head` from container boot sequence and fixed keep-alive targets for instant wakeups.

#### 📝 Documentation & Style
- ✅ **Codebase Translation**: Translated backend roots, infrastructure (`docker-compose`, CI, env files), frontend core API/state logic, and test comments comprehensively to English.
- ✅ **Linting**: Fixed backend formatting and CI validation issues.

---

## [1.4.0] - 2026-04-15

### 🎉 Release Candidate (Production Ready)

#### ✅ Added

**Infrastructure & Full-Stack:**
- ✅ **Custom Domain Setup**: Domain successfully migrated to `argenisbackend.com`.
- ✅ **Email Delivery**: Migrated from Formspree to **Resend** for higher deliverability and control over contact endpoints.
- ✅ **System Demo UI**: Refactored the frontend into a High-Availability Evidence Demo. Contact forms now function as a real-time `TraceConsole`.
- ✅ **Factual Live Metrics**: Removed visual flair from dashboards in favor of raw verifiable telemetry.
- ✅ **Engineering Narrative**: Restructured project data to reflect production constraints (Problem, Challenge, Decision, Trade-off, Impact).

#### 🐛 Fixed

- ✅ **Translation Integrity**: Stabilized ES/PT metric internationalization and corrected UI components.

---

## [1.3.1] - 2026-04-11

### 🔒 Security

- ✅ **Anti-Spoofing Hardening**: Implemented `TRUSTED_PROXY_DEPTH` validation for `X-Forwarded-For` headers, preventing IP spoofing in rate-limiting bypass attempts.
- ✅ **PII Leak Protection**: Automated masking of sender email addresses in structured logs to ensure GDPR/LGPD compliance.
- ✅ **Infrastructure Hardening**: 
    - Moved hardcoded credentials in `docker-compose.yml` (PostgreSQL/Grafana) to mandatory environment variables.
    - Restricted CORS allowed methods to `GET` and `POST` only.
    - Fixed Swagger UI loading by exempting documentation paths from strict Content-Security-Policy.
    - Removed deprecated and potentially insecure `X-XSS-Protection` header.

### 🔄 Modified

- ✅ **Architectural Clean-up**: 
    - Refactored redundant dependency names (`obter_obter_*` -> `dep_*`) for better readability.
    - Centralized application versioning and unified codebase language (removed Spanish/Portuguese inconsistencies).
    - Optimized SQL repository by removing redundant `json.loads` calls on every request.
- ✅ **Observability**: Fixed a resource leak in OpenTelemetry exporters that occurred during test execution.

### 🐛 Fixed

- ✅ **Frontend Resilience**: Added explicit handling for 429 (Rate Limit) and 400 (Duplicate) status codes in the contact form, providing clearer user feedback.
- ✅ **Race Condition Guard**: Added explicit warnings for in-memory idempotency when running multi-worker environments without Redis.

---

## [1.3.0] - 2026-04-04

### ✅ Added

**Backend & Data Layer:**
- ✅ **Migration to PostgreSQL**: Implemented production-ready persistence using SQLModel and Alembic.
- ✅ **Distributed Caching with Redis**: Configured Upstash Redis for high-performance state management.
- ✅ **Smart Rate Limiting**: Added `slowapi` decorators with Redis storage for multi-instance anti-abuse protection.
- ✅ **Persistent Spam Filtering**: Messages are now deduplicated via database hashes, ensuring state survives server restarts.

**Security & Resilience:**
- ✅ **Defense-in-Depth Middleware**: Custom implementation of HSTS, NoSniff, and X-Frame-Options.
- ✅ **Response Compression**: GZip middleware for optimizing data transfer.

---

## [1.2.0] - 2026-04-01

### ✅ Added

**Observability & Monitoring:**
- ✅ **Sentry Integration**: Added Sentry DSN configuration for backend error tracking and transaction tracing.
- ✅ **Prometheus Metrics**: Exposed `/metrics` endpoint for real-time observability of latencies and request rates.
- ✅ **OpenTelemetry Tracing**: Configured `OTLP_ENDPOINT` for distributed tracing with Jaeger/Grafana.
- ✅ **Observability ADR**: Documented metric public visibility decisions.

---

## [1.1.0] - 2026-03-22

### ✅ Added

**Backend:**
- ✅ **Regex-based CORS Support**: Automatically allows any `.vercel.app` domain, avoiding "Blocked by CORS" errors during deployments.
- ✅ **CORS Preflight Tests**: New automated tests for `OPTIONS` requests to ensure secure and functional cross-origin communication.
- ✅ **Idempotency Fix**: Improved test reliability by mocking external email services in the test suite.

**Documentation:**
- ✅ **CORS Policy ADR**: New architectural documentation explaining the security and infrastructure decisions behind the CORS regex implementation.

---

## [1.0.0] - 2025-11-10

### 🎉 Initial Version

#### ✅ Added

**Backend:**
- ✅ Full REST API with FastAPI
- ✅ Clean Architecture (Controllers → Use Cases → Entities → Adapters)
- ✅ API Versioning (`/api/v1/`)
- ✅ Custom exceptions system
- ✅ Standardized global error handlers
- ✅ Observability middleware (Request ID, logging, performance)
- ✅ Health check with metrics (version, environment, uptime)
- ✅ Interactive OpenAPI/Swagger documentation
- ✅ Contact system with email sending
- ✅ 6 functional endpoints (about, projects, stack, experiences, contact, health)
- ✅ Pydantic V2 robust validation
- ✅ 80% minimum test coverage enforced by CI
- ✅ 17 automated tests (pytest + asyncio)
- ✅ JSON persistence (ready to migrate to DB)

**Documentation:**
- ✅ Complete professional root README
- ✅ Detailed backend README
- ✅ Architecture guide (ADR)
- ✅ Deployment guide
- ✅ Testing guide
- ✅ Complete API reference
- ✅ ARCHITECTURE.md (decision log)
- ✅ Production changelog

**DevOps:**
- ✅ Multi-stage Dockerfile for backend
- ✅ Structured Docker Compose (ready for use)
- ✅ GitHub Actions CI for backend
- ✅ GitHub Actions CI for frontend
- ✅ Professional .gitignore
- ✅ .env.example with documented variables

**Frontend (in development):**
- ⏳ Basic structure with Vite + React + TypeScript
- ⏳ TailwindCSS configured
- ⏳ Components under development

---

## [0.1.0] - 2025-11-10 (Pre-release)

### Added
- Initial project structure
- Basic API without versioning
- JSON persistence

---

## 🔮 Next Versions

### [1.4.0] - Planned

**Backend:**
- [ ] **Advanced Simulation**: Transactional flow simulation for a mock "Financial Ledger" (ACID compliance testing).
- [ ] **Identity Research**: Integration of RBAC (Role-Based Access Control) for protected administration panels.
- [ ] **Performance Audit**: Automated P95 latency monitoring in CI.

**Frontend:**
- [ ] **Interactive Visualizations**: Real-time charts for the /metrics data.
- [ ] **E2E Testing**: Full flow coverage with Playwright.

---

## Versioning Conventions

- **MAJOR** (1.x.x): Incompatible API changes
- **MINOR** (x.1.x): Compatible new features
- **PATCH** (x.x.1): Bug fixes

---

## Types of Changes

- `✅ Added` - New features
- `🔄 Modified` - Changes in existing features
- `⚠️ Deprecated` - Features to be removed
- `🗑️ Removed` - Features removed
- `🐛 Fixed` - Bug fixes
- `🔒 Security` - Vulnerability fixes

---

[1.3.1]: https://github.com/Argenis1412/portfolio/releases/tag/v1.3.1
[1.3.0]: https://github.com/Argenis1412/portfolio/releases/tag/v1.3.0
[1.2.0]: https://github.com/Argenis1412/portfolio/releases/tag/v1.2.0
[1.1.0]: https://github.com/Argenis1412/portfolio/releases/tag/v1.1.0
[1.0.0]: https://github.com/Argenis1412/portfolio/releases/tag/v1.0.0
[0.1.0]: https://github.com/Argenis1412/portfolio/releases/tag/v0.1.0
