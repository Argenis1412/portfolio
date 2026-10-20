# ADR-17: Chaos E2E Testing Strategy

**Status:** Historical decision; backend strategy retired in the cleanup branch.
**Original date:** 2026-05-04. **Version:** v1.7.0.
The root architecture index uses decision 18 for this topic; this filename and
identifier remain stable for existing references.

## Historical decision

The earlier backend exposed a Chaos Playground. The decision proposed weekly E2E
scenarios in local Docker Compose rather than production or staging, aiming to
exercise degradation and recovery without mutating a live service.

It also retained HTTP 200 for degraded `/health` responses to distinguish
serving degraded content from an unavailable process. A failed health check's
restart or routing effect depends on the platform and probe configuration; it
is not universally a container restart.

## Current status and limits

Backend Chaos routes, SQL paths, and their automation have been removed. This
ADR is not evidence that a weekly Chaos workflow currently exists or that old
scenarios passed on this branch. Local experiments also cannot prove behavior
under provider failures or production load.

`/live` checks process response. `/health` checks JSON files and reports email
configuration; it can return HTTP 200 with `status="degraded"`. The former
`dependencies.db` example is not the current contract. See the
[operations runbook](production-operations.md#runtime-and-health-signals).

Existing frontend Chaos consumers and smoke scenarios still need retirement
before merge/deployment; see the [release blocker](../../CHANGELOG.md#frontend-deployment-dependency).
Future failure experiments require their own scope and evidence, not revival of
this retired contract. Original wording remains available with
`git show bb3ff44:docs/architecture/ADR-17-chaos-e2e-strategy.md`.
