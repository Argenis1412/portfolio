# Explicit Failure Model and Incident History

The current policy below describes the cleanup branch. Incident summaries retain
version-specific history from the [changelog](../../CHANGELOG.md); historical
mitigations do not imply that retired components still exist or that destructive
recovery is authorized today.

## Current failure boundaries

| Component | Accepted degradation | Evidence and limits |
|---|---|---|
| Portfolio JSON | Failed reads surface errors; `/health` reports degraded files. | On-demand content cache and uncached file checks differ. No SQL fallback; no claim that every error produces empty content. |
| Redis rate limits | Contact uses local memory; reads fail open on storage errors. | `rate_limiter_degraded_mode`, `rate_limiter_backend_unavailable`, and `rate_limit_backend_unavailable_total` distinguish modes. A failure of the contact memory fallback also allows through. |
| Deduplication/idempotency | Redis exceptions permit local fallback. | Local state resets and is not distributed. Redis lock contention remains a replay or HTTP 409, never a second local lock. |
| Contact queue | Missing/failed enqueue uses background delivery. | Response `delivery_mode` distinguishes stream from fallback; acceptance does not prove delivery. Background delivery is not durable and has no automatic retries. |
| Stream delivery | Classified retries and DLQ preserve failed work for diagnosis. | Publish-before-ack and pending recovery support at-least-once processing, not exactly-once delivery. Provider acceptance does not prove inbox arrival. |
| API process | An unavailable process cannot serve reads or consume work. | `/live` establishes response from the process; `/health` checks JSON and reports email configuration, not Redis/Resend connectivity. |
| Browser policy | CSP or CORS mismatch can block API use. | Verify the actual frontend origin and deployed policy together. |
| Build/infrastructure | Failed changes can block a release. | Inspect the plan and platform state; do not assume every failed apply leaves all resources untouched. |

Spam scoring labels email; honeypots silently drop it. Validation, duplicates,
and rate limits still reject submissions. No universal fail-open or fail-silent
policy applies to all failures.

The retired `system_telemetry` block, circuit-breaker counts, SQL degradation
flags, and Chaos simulation fields are not current API contracts. Existing UI
consumers still need retirement before release. Use actual HTTP/worker telemetry,
logs, and delivery evidence rather than inferring health from removed fields.

## Historical incident index

These are summaries of recorded incidents, not new production verification.
Original narratives, detection details, and release history remain in the
[changelog](../../CHANGELOG.md). The previous expanded model is available with
`git show 9211c24:docs/architecture/FAILURE_MODEL.md`.

| Incident and period | Recorded failure and detection | Historical mitigation and present relevance |
|---|---|---|
| INC-001, v1.2.0 to v1.3.0 | Local rate-limit counters reset on restarts; discovered manually. | Redis introduced shared counters (root ADR-11). Current contact degradation uses local limiting, with the limits described above; the old universal fail-open description is superseded. |
| INC-002, v1.2.0 to v1.4.1 | Warm API probes missed database connection latency on reads; user-facing timings exposed the gap. | JSON-first reads removed database round trips (root ADR-05). Current loading is on demand, not at startup; SQL is now retired from the application. |
| INC-003, v1.4.x | A secondary Chaos database write crashed the simulation during a connectivity issue; observed manually. | Persistence exceptions were isolated (root ADR-15.1). Both Chaos and SQL application paths are now retired. |
| INC-004, v1.3.x to v1.4.0 | Browser CSP blocked the custom API domain; console violations exposed the mismatch. | Coordinate CSP and CORS (root ADR-15.3). Domain changes still require checking both policies. |
| INC-005, v1.6.0 | Different Docker build contexts broke Koyeb and CI builds. | Standardize repository-root context (root ADR-15.2). Build validation remains a release prerequisite. |
| INC-006, v1.7.0 to v1.8.0 | Separate link/domain extraction mishandled mixed `https://` and bare `www.` links to different sites, adding an incorrect spam penalty; found during static review. | Unified URL extraction and normalization, recorded in the changelog. Current scores flag messages rather than suppress delivery. |
| INC-007, v1.7.0 to v1.8.1 | Koyeb provider v0.1.11 could not send required literal-environment metadata; apply returned HTTP 400. | Secret-first orchestration bypassed that schema limitation. This is version-specific evidence, not a claim about current provider capabilities. |
| INC-008, v1.7.1 to v1.8.1 | A recorded ownership/domain migration involved deleting the manual service and 14 hours of downtime. | Cold migration was accepted for that event. It is not a standing policy permitting service deletion or downtime in this cleanup. |
| INC-009, v1.8.1 to v1.8.2 | Terraform key renames mapped to the same physical secret, causing create/destroy collisions; apply failed. | State continuity through `moved` blocks avoided replacement. Preserve existing resource/secret identities and review plans. |

Historical IaC references used ADR-18 in detailed documents; the root decision
index uses ADR-19. See [architecture](../../ARCHITECTURE.md) for the numbering
convention. Incident numbers follow the changelog; standalone case-study titles
must be read in their own context rather than silently renumbered.

## Operational references

- [Resilience policy](resilience-failure-handling.md)
- [Operations runbook](production-operations.md): triage, retries, recovery, and release prerequisites
- [SLO definitions](SLO_DEFINITIONS.md): targets and measurement limits
- [Engineering playbook](../../ENGINEERING_PLAYBOOK.md): scoped changes and evidence standards

Detailed incident reports retain their version context and stable paths. Their
recorded observations are historical evidence, not current production verification.
See the [release guide](../RELEASE_READINESS.md) for outstanding validation.
