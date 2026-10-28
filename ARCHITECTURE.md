# Portfolio Architecture

The portfolio presents projects, selected engineering decisions, experience, and
contact. Home follows Hero → Projects → About → Contact; project and decision
routes provide detail. Public pages do not mount metrics polling or Chaos controls.
The [frontend guide](frontend/README.md) describes routes and visual implementation.

## System boundaries

| Boundary | Responsibility |
|---|---|
| React application | Localized presentation, navigation, themes, query caching, and contact interaction. |
| Frontend API modules and hooks | HTTP calls, response validation, queries, and contact mutations. |
| Backend controllers | Routing, dependency composition, validation, and HTTP responses. |
| Use cases and entities | Content retrieval/sorting and contact message construction/delivery through injected adapters. |
| Adapters | JSON repository, email delivery, and structured logging. The repository interface also lives here. |
| Backend core and worker | Protection, caching, telemetry, Redis queue, retries, and pending recovery. |

Architecture tests protect domain import boundaries. The implemented use cases
depend on injected adapter interfaces; these are the existing layering boundaries.

## Content reads

```text
React → TanStack Query hooks → API service/client + Zod
      → FastAPI controller → use case → JsonRepository → backend/data/
```

The JSON repository loads content on demand and caches successful reads until
process restart. Content changes require a new artifact/process. Project detail
is enriched by an optional case-study sidecar. There is no SQL application path
or runtime content editor. HTTP ETag caching is a separate layer; see
[JSON reads and caching](docs/architecture/JSON_FIRST_READ_PATH.md).

## Contact processing

```text
useContactForm → contact mutation → validated contact controller
  → optional idempotency reservation → honeypots/scoring/deduplication/limits
  → Redis Streams → in-process consumer → Resend
  → background delivery when enqueue is unavailable
```

Redis shares protection state and accepted jobs. Redis exceptions allow local
protection fallbacks, which cannot coordinate replicas or survive restarts.
Lock contention remains a replay or HTTP 409. Honeypots silently drop messages;
spam scores label them, while duplicates and exhausted limits remain rejections.

One Uvicorn process owns one consumer per instance when enabled. Stream processing
is at least once: retries, DLQ handling, and pending recovery can repeat delivery.
Background delivery is non-durable and has no automatic retries. HTTP acceptance
does not establish inbox delivery. Detailed limits are in the
[backend guide](backend/README.md#reliability-and-failure-behavior).

## Operations and evidence

- `/live` checks process response; `/health` checks JSON files and reports email
  configuration. A degraded health body still uses HTTP 200.
- HTTP and worker metrics describe one process. Logs and optional Sentry/OTel
  support diagnosis; see [observability](docs/architecture/observability.md).
- Terraform manages Koyeb compute, domain, and secrets while preserving stable
  identities. External services and frontend hosting have separate configuration;
  see [infrastructure](infrastructure/README.md).
- [Targets](docs/architecture/SLO_DEFINITIONS.md) and
  [historical experiments](benchmarks/README.md) do not establish current capacity.
  Deployment verification belongs to the [runbook](docs/architecture/production-operations.md).

[CHANGELOG.md](CHANGELOG.md) contains the consolidated v1.9.2 notes and a compact
historical incident index. Retired SQL/Chaos designs remain in Git history.
