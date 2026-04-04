# 📊 CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/en/2.0.0/).

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

[1.3.0]: https://github.com/Argenis1412/portfolio/releases/tag/v1.3.0
[1.2.0]: https://github.com/Argenis1412/portfolio/releases/tag/v1.2.0
[1.1.0]: https://github.com/Argenis1412/portfolio/releases/tag/v1.1.0
[1.0.0]: https://github.com/Argenis1412/portfolio/releases/tag/v1.0.0
[0.1.0]: https://github.com/Argenis1412/portfolio/releases/tag/v0.1.0
