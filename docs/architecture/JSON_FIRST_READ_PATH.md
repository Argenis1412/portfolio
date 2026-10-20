# Architecture Decision Record: JSON-First Read Path

## Context and decision

INC-002 recorded database connection latency on portfolio reads in v1.2.0 through
v1.4.1. JSON-first reads removed that dependency. The cleanup branch also removes
the remaining SQL application paths; retained infrastructure is not evidence of
an active database dependency.

Static portfolio content lives in `backend/data/`. `JsonRepository` reads files
on demand through a thread and caches successful parsed values in its repository
instance. Files are not precompiled by this repository or preloaded at startup.
Project lookup builds a cached ID index after reading projects. Optional case
study content enriches projects when the sidecar exists.

## Consequences

- Reads do not require PostgreSQL, Redis, or Resend connectivity for content.
  Rate limiting is a separate concern; read-only checks fail open on storage errors.
- Content updates belong in version control and the deployed artifact. Restart or
  redeploy after changing files to replace cached values; there is no live cache
  invalidation or CRUD interface.
- Missing, unreadable, or malformed files can fail requests. JSON-first is not a
  silent fallback to successful empty content. Some repository mappings normalize
  unexpected shapes; `/health` separately checks required top-level types.
- `/health` reads files independently of the content cache and reports per-file
  results. It returns HTTP 200 even for degraded data and does not test external
  provider connectivity or validate every content field.
- HTTP ETags and response cache headers are separate from the repository cache;
  see the [current architecture](../../ARCHITECTURE.md#current-backend-design).

## Evidence and limits

INC-002's 280-400 ms latency and historical improvements describe the old release,
not a benchmark of this branch. No sub-50 ms or unlimited scalability guarantee
follows from using JSON. Hosting startup, middleware, serialization, and resource
limits still affect latency. Validate against the [SLO targets](SLO_DEFINITIONS.md)
and a deployment-sized load test before claiming compliance.

See the [incident history](../../CHANGELOG.md), [failure model](FAILURE_MODEL.md),
and [operations runbook](production-operations.md).
