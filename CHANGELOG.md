# Changelog

## v1.9.2 — Unreleased

Consolidated notes prepared for publication. No GitHub release or release tag is
created by this documentation change, and deployment of this source is unverified.
Earlier numbered headings were documentation labels, not verified publications;
they have been consolidated here. The API currently declares version `1.9.2`.

### Frontend

- Home presents introduction, open project rows, About, and Contact. Skills,
  employment/education, and contact response details use native disclosures.
- Project case studies and decision routes retain engineering context. The
  portfolio case links to the Terraform identity incident and a dated local load
  report. `/production-evidence` redirects to `/projects/portfolio-api`.
- Public pages no longer mount Chaos controls, synthetic traces, or metrics
  polling. Existing lower-level telemetry code remains in the repository.
- EN/PT/ES, persistent light/dark themes, mobile navigation, and contact controls
  remain. The frontend guide documents the implemented visual system.
- Loja App remains a project and case study; employment and education remain
  under About. Housing Finance GPS is presented without a public demo.

### Backend and infrastructure

- Content comes from cached JSON with ETag responses. SQL dependencies, migration
  steps, and Chaos endpoints are retired; retired Chaos routes return 404.
- Contact validation precedes idempotency reservation. Token ownership protects
  reservation updates/releases; cancellation cleanup is shielded and bounded.
  Redis contention does not acquire a second memory lock.
- Redis supports protection and Streams delivery. Storage errors permit local
  protection fallbacks; queue failure permits non-durable background delivery.
- The API lifespan owns a supervised consumer with classified retries, DLQ
  transfers, and pending recovery. Processing is at least once; duplicate email
  remains possible after interrupted acknowledgment.
- Production startup requires Redis, metrics authentication, and nonblank Resend
  key/recipient settings. English application keys coexist with stable legacy
  Terraform secret identities.
- HTTP/worker telemetry and optional Sentry/OTel remain. `/health` checks JSON and
  reports email configuration; `/live` checks process response. Deprecated health
  aliases remain pending monitor verification.
- Guides are consolidated around implemented behavior. Unsupported performance
  claims, obsolete plans, duplicate guides, and incomplete generated summaries
  are removed.

### Validation boundaries

Repository coverage includes backend protection/delivery/content tests, frontend
unit/component tests, and isolated Chromium E2E. UI fixtures fake contact delivery.
The [local load report](benchmarks/results/f9eaa7f-local-20261017/README.md) retains
two runs with successful functional checks and failed latency thresholds.
Current deployment, production monitoring, and capacity remain unverified; use the
[release checks](docs/architecture/production-operations.md#release-checks).

## Historical engineering notes

Identifiers below come from earlier repository reports. Code history supports the
implementation changes; original production logs and quantitative impact evidence
are not retained here. These notes describe historical context. Earlier narratives
are available at [the audit baseline](https://github.com/Argenis1412/portfolio/blob/beeb5b6/CHANGELOG.md).

| Record | Recorded problem and retained evidence |
|---|---|
| INC-001 — rate-limit persistence | Process-local counters reset on restart. Redis-backed protection was introduced; current local fallback remains process-bound. See [rate-limit history](https://github.com/Argenis1412/portfolio/commits/main/backend/app/core/rate_limit.py). |
| INC-002 — cold reads | Reports attributed slow portfolio reads to database connection overhead despite warm probes. JSON reads removed the application dependency; old latency figures are omitted. See [current read path](docs/architecture/JSON_FIRST_READ_PATH.md). |
| INC-003 — secondary persistence failure | Reports described a Chaos database write aborting its primary simulation action. Both paths are retired by [backend cleanup](https://github.com/Argenis1412/portfolio/commit/d0d1cea). |
| INC-004 — browser policy | Frontend CSP blocked requests to the custom API domain. [Policy changes](https://github.com/Argenis1412/portfolio/commit/d7c2638) cover frontend CSP and backend CORS; both policies still need review when changing origins. |
| INC-005 — build context | Different Docker contexts broke builds. [Root-context changes](https://github.com/Argenis1412/portfolio/commit/a35c3c6) aligned paths with the monorepo. |
| INC-006 — spam scoring | Separate link/domain extraction misclassified mixed HTTPS and bare `www.` URLs. [Normalization](https://github.com/Argenis1412/portfolio/commit/12a39df) and regression tests addressed the mismatch. |
| INC-007 — provider schema | An earlier Koyeb apply rejected literal environment metadata. [Secret-reference wiring](https://github.com/Argenis1412/portfolio/commit/fb54104) records the workaround; current provider restrictions were not revalidated. |
| INC-008 — ownership migration | Reports describe deleting a manual service before creating its managed replacement during a domain/ownership conflict. The source report is retained in [Git history](https://github.com/Argenis1412/portfolio/blob/beeb5b6/docs/architecture/INCIDENT_DESTRUCTIVE_IAC_MIGRATION.md); downtime and claims that deletion was unavoidable are unverified. |
| INC-009 — secret identity | Terraform key renames collided with existing secrets. [Moved blocks](https://github.com/Argenis1412/portfolio/commit/70a4ee4) preserve address continuity; the UI links to the [retained report](docs/architecture/INC-009-terraform-resource-collision.md). |

### Historical rate-limit and proxy audit

The standalone audit formerly also used `INC-005`; that identifier belongs to the
build-context record above. [Commit aa87494](https://github.com/Argenis1412/portfolio/commit/aa87494)
added mocked storage-failure coverage and proxy allowlist support. The historical
contact behavior rejected Redis failures with 503; [later degradation changes](https://github.com/Argenis1412/portfolio/commit/ed1a60c)
introduced memory fallback. This was a controlled audit, not evidence of a
production attack. Current proxy and fallback behavior is documented in the
[backend guide](backend/README.md).
