# Architecture and Decision Index

This document describes the backend cleanup branch. **Deployment remains blocked
by frontend retirement**; see [remaining consumers](CHANGELOG.md#frontend-deployment-dependency).
The [backend guide](backend/README.md) defines configuration and API behavior;
the [operations runbook](docs/architecture/production-operations.md) defines triage
and release prerequisites. Neither this document nor historical benchmarks
establishes the state of the deployed service.

## Current backend design

| Boundary | Responsibility |
|---|---|
| `app/controllers/` | HTTP routing, dependency composition, response mapping, and contact orchestration. |
| `app/use_cases/` | Retrieve/sort content and construct/deliver contact messages through injected repository, email, and logger adapters. |
| `app/entities/` | Domain data; architecture tests protect its framework/import boundaries. |
| `app/adapters/` | Repository interface and JSON implementation, email adapters, structured logger. |
| `app/core/` | Request protection, caching, Redis clients, queue, middleware, and telemetry. |
| `app/worker.py` | Redis Streams consumption and recovery inside the API lifespan. |

The repository interface currently lives in the adapters package. Use cases accept
these injected adapters; tests use doubles at those boundaries. This is the
implemented dependency structure, not a claim of complete infrastructure
independence. The frontend consumes HTTP rather than accessing backend storage.

### Content and caching

`JsonRepository` reads checked-in JSON on demand and caches successful reads in
memory until process restart. Files are not preloaded at startup. Content changes
require a new deployed artifact/process; there is no SQL adapter, migration, seed
step, or runtime content editor. Existing external database resources remain intact.
HTTP content responses use ETag/304 with a 300-second cache lifetime and a
60-second stale-while-revalidate window.

The JSON health check bypasses that cache, checks required files and expected
top-level types, and checks the optional sidecar when present. It does not validate
every content field. File failures can therefore leave cached reads available
while `/health` reports degradation. A failed uncached stack read propagates as
an error rather than a successful empty response.

### Contact protection and delivery

Honeypots silently accept/drop bot submissions. Spam scoring labels messages;
it does not discard them. Deduplication and email/IP/fingerprint limits can reject
requests. Optional idempotency keys replay finalized responses or reject concurrent
requests with 409. A Redis lock refusal never becomes a memory acquisition.

Redis shares protection state and accepted stream jobs across processes. Redis
exceptions activate local protection fallbacks; these reset on restart and cannot
coordinate replicas. Missing/failed queues use non-durable background delivery.
The API's HTTP acceptance response does not confirm provider or inbox delivery.

Docker uses one Uvicorn process, with the consumer controlled by `WORKER_ENABLED`.
Stream processing provides at-least-once semantics, bounded retries, DLQ handling,
and pending-entry recovery; duplicate processing is possible. Retry/DLQ publication
precedes acknowledgment of the original job. Background fallback has no automatic
retries. Shutdown cancels remaining work after its grace period and closes the
consumer connection. A deployment-sized capacity test remains pending.

### Configuration, telemetry, and security

Settings use English keys and validated environment names. Redis client creation
is shared, with longer blocking-read timeouts retained for the worker. Production
requires Redis, metrics Basic Auth credentials, and restricted CORS configuration.
CORS combines configured origins with an optional regex; CSP is separately defined
for the frontend. Review both sides when changing browser origins.

Prometheus reports HTTP and worker metrics per process. The summary uses observed
latency/request/error data; retired synthetic fields are absent. Sentry and
OpenTelemetry are optional. `OTEL_ENABLED=false` disables OpenTelemetry without
disabling Prometheus or Sentry. Tests select external-service behavior explicitly.
Logs use shared email masking; this does not imply arbitrary log fields or
exception text are automatically scrubbed. HSTS is conditional on production or
HTTPS; security headers are not evidence that every middleware error path is covered.

Terraform manages Koyeb while GitHub Actions supplies secret values. Stable
internal identities and moved blocks are preserved. Application SQL removal does
not authorize external database deletion or secret renaming. `/saude` and `/salud`
remain deprecated static liveness-style routes pending monitor verification.

## Numbered decision index

Numbers retain the original root-document references. Dedicated ADR filenames
sometimes use different numbers; use the title and release context when following
older citations. Frontend entries record context, not a new frontend audit.

| ID | Decision | Status and retained rationale |
|---|---|---|
| 1 | Backend layers | Current: isolate HTTP concerns and inject adapters; actual boundaries are described above. |
| 2 | Decoupled frontend/API | Current: browser HTTP contract, independent deployment artifacts, explicit CORS. |
| 3 | JSON without SQL | Current: remove unused persistence dependencies; retained external resources are a separate concern. |
| 4 | Protected metrics | Current: production `/metrics` requires Basic Auth; telemetry is local to each process. |
| 5 | JSON-first reads | Current: avoid database round-trips for static content; earlier latency numbers are historical measurements. |
| 6 | Browser origin policy | Current: configured allowlist plus optional regex, with separate frontend CSP. |
| 7 | English identifiers | Current: English settings/code; deprecated health routes remain until monitor migration is verified. |
| 8 | TanStack Query/server state | Frontend context: cache remote data separately from local UI state. Frontend cleanup remains pending. |
| 9 | Sentry | Current optional backend integration; frontend configuration is separate. Cross-service correlation requires actual configuration/evidence. |
| 10 | Headers/compression | Current middleware: conditional HSTS, browser security headers, gzip. No universal response-path guarantee. |
| 11 | Redis shared state | Current: rate limits, idempotency, deduplication, and stream queue; local fallback is process-bound. |
| 12 | Possible Go expansion | Deferred proposal, not an approved service or roadmap commitment. Measure a real bottleneck before adding another deployment. |
| 13 | Frontend telemetry overlays | Historical/current UI context: real and synthetic samples must be distinguishable; removed backend fields require UI retirement. |
| 14 | Modular frontend API | Frontend context: client, schemas, services, business hooks, and presentational components. Chaos-specific pieces remain pending cleanup. |
| 15.1 | Fail-silent Chaos SQL writes | Retired: simulation endpoints and incident writes were removed. See INC-003 for the original failure. |
| 15.2 | Root Docker build context | Current: build `backend/Dockerfile` from the repository root to keep COPY paths consistent. Current image verification is pending. |
| 15.3 | CSP/CORS coordination | Current: review API origins and frontend connect-src together; see INC-004. |
| 16 | English contracts/localized content | Current: English API identifiers with localized content. JSON claims/snapshots require deliberate review. |
| 17 | Separate error/latency alerts | Design rule: distinguish symptoms and align buckets/SLOs. Verify actual deployed alert rules and labels rather than assuming they match older prose. |
| 18 | Local Chaos E2E | Retired backend strategy: its workflow/endpoints were removed. Remaining frontend smoke scenarios are a release blocker. |
| 19 | Minimum IaC | Current: Terraform-managed Koyeb and externally provisioned stateful services; preserve ownership and identities. |
| 20 | Redis Streams delivery | Current, with explicit limits: at-least-once processing, bounded retries/DLQ, PEL recovery, and non-durable fallback. |
| 21 | Simulated 503 UI traces | Historical UI convention, not proof of an HTTP failure or current backend behavior. |
| 22 | Hiring home/evidence separation | Frontend/content design context: concise home, detailed evidence route, stable links, explicit evidence labels. See the [content contract](docs/architecture/PORTFOLIO_CONTENT_CONTRACT.md). |

## History and remaining review

[CHANGELOG](CHANGELOG.md) preserves released behavior and incident narratives.
Earlier architecture wording is available with
`git show 615c9a5:ARCHITECTURE.md`; retired decisions remain indexed above rather
than being relabeled as current features.

Detailed documents under `docs/architecture/`, the historical failure model, and
case studies still need a context/consistency pass. Portfolio JSON and content
snapshots are unchanged. Use the current backend guide and operations runbook for
runtime behavior; use [SLO definitions](docs/architecture/SLO_DEFINITIONS.md) and
versioned benchmarks as targets and historical evidence, not newly verified results.
