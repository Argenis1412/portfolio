# 📊 CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/en/2.0.0/).

---

## [1.6.0] - 2026-04-22

### 🏗️ Full Structural Refactor & Global Localization

#### ✅ Added
- ✅ **Layered Frontend API**: Completely restructured the frontend API layer into a modular `src/api/` directory with dedicated services for `portfolio` and `chaos` domains.
- ✅ **Sub-component Decomposition**: Extracted `ChaosTerminal` and `ChaosActionCard` sub-components to reduce monolith sizes and improve maintainability.
- ✅ **New Performance Hooks**: Implemented `useCurrentTime` for stable, reactive time management across the dashboard.

#### 🔄 Modified
- ✅ **100% English Backend Migration**: Fully migrated the backend from Portuguese to English-first.
- ✅ **Monorepo Build Context**: Fixed "Dockerfile not found" by unifying build context at the root for Koyeb and GitHub.
- ✅ **Dockerfile Hardening**: Updated `backend/Dockerfile` to be root-aware for monorepo CI/CD.
- ✅ **Unified Data Schemas**: Updated all frontend Zod schemas and TypeScript interfaces to sync with English backend property names.

#### 🐛 Fixed
- ✅ **Chaos Persistence Crash**: Implemented fail-silent pattern in `chaos.py` to prevent simulation crashes on DB errors.
- ✅ **CSP / CORS Domain Sync**: Resolved connectivity issues between Vercel and Koyeb by whitelisting `api.argenisbackend.com`.
- ✅ **GitHub Actions CI**: Corrected `backend-ci.yml` to build from root context, ensuring production consistency.
- ✅ **React Hook Purity Violation**: Resolved ESLint error in `ChaosPlayground.tsx` caused by direct `Date.now()` calls.
- ✅ **Obsolete Code Cleanup**: Deleted deprecated `frontend/src/api.ts` shim.

---

## [1.5.1] - 2026-04-21

### 🔭 Honest Telemetry and Stronger Narrative Sections

#### ✅ Added
- ✅ **Synthetic vs Real Telemetry Labels**: The dashboard now labels projected chaos samples separately from backend-confirmed metrics and shows a confidence indicator.
- ✅ **Adaptive Chaos Posture**: Chaos presets now affect retry posture, cache TTL expectations, and lifecycle presentation in addition to failure visuals.
- ✅ **Structured Project Stories**: Projects now render from `descricao_completa` as case studies with Problem, Constraint, Decision, Trade-off, Impact, and Stack sections.
- ✅ **Engineering Journey Timeline**: Experience and education now render as a vertical timeline organized around decision, failure, learning, and impact signals.

#### 🔄 Modified
- ✅ **Telemetry Sparkline**: Reduced marker weight, shortened the visible window, added an average baseline, and differentiated synthetic telemetry with a dashed violet segment.
- ✅ **Incident History**: Chaos incidents now show duration, impact percentage, and source metadata.
- ✅ **Documentation**: Updated README and observability ADR to document synthetic telemetry reconciliation and stronger portfolio storytelling sections.

---

## [1.5.0] - 2026-04-21

### 🧨 Deterministic Chaos & Multi-Language Operational Excellence

#### ✅ Added
- ✅ **Stateful Decision Engine**: Implemented a robust React-side decision logic (`useDecisionEngine.ts`) with hysteresis thresholds to manage system lifecycle state transitions (`NORMAL` → `DEGRADED` → `RECOVERING` → `STABLE`).
- ✅ **Deterministic Chaos Presets**: Added global Chaos Control (`off`, `mild`, `stress`, `failure`) injected into backend requests via `X-Chaos-Preset` headers for reproducible failure scenarios.
- ✅ **Infrastructure Trade-offs**: New `ArchitectureTradeoffs` section documenting engineering compromises (Latency vs. Consistency, Sync vs. Async) with real-world operational impacts.
- ✅ **Operational Post-Mortem**: Added Case Study #0042 (Redis Connection Leak) as a featured archived incident, demonstrating MTTR and technical debt resolution.
- ✅ **Full Multi-Language Support (OPS)**: Completed 100% localization for all new operational sections across English, Spanish, and Portuguese.
- ✅ **Interactive Chaos Banner**: Real-time adaptive banner showing the active simulation mode and technical hints.

#### 🔄 Modified
- ✅ **Backend Resilience**: Hardened `api.py` and `chaos.py` with defensive field access to prevent `KeyError` during rapid state transitions.
- ✅ **Telemetry Quantifiers**: Enhanced `TraceEntry` with `impactPct` and `latencyDelta` for measurable failure analysis.
- ✅ **Zod Schema Evolution**: Updated `MetricsSummarySchema` to include `system_lifecycle` and sub-system health statuses.
- ✅ **Fixed Documentation**: Summarized README and ARCHITECTURE to reflect the new maturity levels of the SRE-lite dashboard.

#### 🐛 Fixed
- ✅ **Frontend Test Stability**: Resolved `fetch` mock leaks and argument mismatches in `api.test.ts`.
- ✅ **i18n Grammar Pass**: Standardized technical terminology and fixed verb errors in localized strings (e.g., "Fuga de Conexiones").

---

## [1.4.2] - 2026-04-20

### 🔧 Observability & Engineering Rigor

#### ✅ Added
- ✅ **Enhanced Metrics Sparkline**: Added MetricsSparkline component with linear line, threshold lines, and vertical incident markers for real-time telemetry.
- ✅ **Extended Metrics Hook**: Extended useLiveMetrics to keep timestamped samples, baseline P95, recent traces, latest event, circuit-breaker and timeout states.
- ✅ **Rewritten Live Metrics Bento**: LiveMetricsBento now shows delta vs previous, delta vs baseline, failure-model panel, and telemetry timeline.
- ✅ **Hero Sidecar Updates**: Updated Hero sidecar to render real sparkline, circuit state, and latest trace.
- ✅ **Chaos Playground Enhancements**: Modified ChaosPlayground to emit trace_id and include richer log fields (retry_triggered, circuit_breaker, timeout_ms).
- ✅ **Trace & Log Improvements**: Enhanced TraceViewer and LogStream to display both request_id and trace_id for end-to-end correlation.
- ✅ **Fixed LogStream Auto-scroll**: Fixed LogStream auto-scroll to stay inside the terminal and removed global window.scrollTo in App.tsx.
- ✅ **Engineering-Focused Journey**: Converted backend/dados/experiencias.json from prose to engineering bullets (same text in EN/PT/ES).
- ✅ **Enriched Contact Contract**: Enriched backend contract (RespostaContato) with queue_status, delivery_mode, and downstream; updated controller and frontend API/UI to display enriched response.
- ✅ **Streamlined Contact UI**: Compacted footer contact cards, removed duplicated GitHub/LinkedIn buttons, added fixed lateral SocialRail component.
- ✅ **Operational Case Studies**: Rewrote Projects.tsx to render each project as an operational case study (capabilities, engineering notes, runtime, evidence surface) using existing funcionalidades and aprendizados fields.
- ✅ **Added Missing i18n Keys**: Added missing i18n keys for metrics, failure model, telemetry legend, contact spec fields, and console lines.
- ✅ **UI Refinements**: Redesigned MetricsSparkline (linear, markers, gradients), obfuscated contact info for privacy, and fixed terminal visibility in light mode.
- ✅ **Alert Tuning**: Optimized Error Rate thresholds (4.5%) and high-visibility incident animations.
- ✅ **Bug Fixes**: Resolved LogContext initialization and SVG syntax errors.

#### 🗑️ Removed
- ✅ **Unused Philosophy Assets**: Deleted unused philosophy assets (frontend/public/philosophy/*.jpg).
- ✅ **Stale i18n Keys**: Removed stale i18n keys (about.github, about.linkedin, contact.*_copy_*).

#### 📚 Documentation & Cleanup
- ✅ **Updated Documentation**: Updated Markdown documentation (README, ARCHITECTURE) to reflect new observable behavior and contracts.
- ✅ **Verified Test Suite**: Ensured all changes pass lint, type-check, unit tests, and backend pytest suite.

---
## [1.4.1] - 2026-04-19

### 🛠️ Enhancements & Reliability

#### ✅ Added
- ✅ **Philosophy & Inspirations**: Implemented a new section showcasing engineering pillars with Clean Architecture backend (JSON data source), accessible card-based UI with adaptive animations, and 100% test coverage.
- ✅ **TraceConsole UI**: Allow continuous payload testing without reloading (`#10`).
- ✅ **Chaos Engineering**: Implement honest chaos playground and enhanced failure metrics.

#### 🚀 Performance
- ✅ **Cold Start Optimization**: Removed `alembic upgrade head` from container boot sequence and fixed keep-alive targets for instant wakeups.

#### 🎨 UI Polish & Fixes
- ✅ **Hero Section**: Elevated layout for immediate visibility.
- ✅ **Philosophy Layout**: Enlarged right-aligned profile photos for better aesthetic balance.
- ✅ **Live Metrics Synchronization**: Dynamic banner coloring and precise KPI status alignment across three languages.
- ✅ **Navigation Stability**: Fixed an issue causing automatic scroll scrolling to underneath sections on initial page load or reloads.

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
