# Portfolio Content Contract

## Purpose

This is the retained content/design contract, not proof that every current UI
consumer matches the cleanup backend. Chaos retirement still blocks release; see
the [release prerequisites](../RELEASE_READINESS.md). JSON copy and public-response
snapshots require a separate deliberate review and are unchanged in this block.

The portfolio is a hiring artifact first and a system demonstration second.
Its home page must answer, in order: who the engineer is, what they build,
why their code is trustworthy, how they make decisions, and where to inspect
operational evidence.

## Home Page Contract

The home page owns only this sequence:

1. Hero: identity, specialization, and hiring CTAs.
2. Featured Projects: three projects with a problem, decision, and outcome.
3. Engineering Proof: concise evidence of architecture, testing, delivery,
   reliability, and documentation practices.
4. Engineering Decisions: decision summaries linked to their evidence.
5. Engineering Principles: five concise working principles.
6. Production Snapshot: a compact, honest link to operational evidence.
7. Experience, contact, and short biography.

The home page does not own detailed traces, logs, or full incident narratives.
Those belong to `/production-evidence`. The earlier placement of interactive
Chaos controls there is historical; retiring those controls remains required.

## Evidence Rules

Every numerical or operational claim has one source and one classification:

| Classification | Meaning | Home-page behavior |
| --- | --- | --- |
| `REAL` | Verifiable production telemetry or a checked-in test/CI artifact. | May appear in the Production Snapshot with source context. |
| `REPRODUCED` | Controlled experiment that recreates a production-relevant behavior. | May appear in a case study with its environment stated. |
| `SYNTHETIC` | Deliberately simulated demonstration data. | Never presented as production data. |

A `REAL` implementation or test artifact is not production telemetry. Always state
which kind of evidence supports a claim, with its release, environment, and source.
A historical classification does not establish current availability or performance.

The following claims must be presented with these boundaries:

| Claim | Source | Classification |
| --- | --- | --- |
| JSON-first reads have no SQL application dependency. | [JSON decision](JSON_FIRST_READ_PATH.md), historical INC-002. | Implementation evidence; historical latency figures retain their release context. |
| Contact uses Redis Streams, classified retries, DLQ, and pending recovery when queued. | [Architecture](../../ARCHITECTURE.md), backend tests. | `REAL` implementation evidence; background fallback is not durable, and acceptance is not inbox delivery. |
| Backend test configuration requires 80% coverage. | `backend/pytest.ini`, backend workflow. | Repository configuration; CI execution requires a matching trigger and a successful run artifact. |
| Old Chaos scenarios and frontend fixture responses exist in history/current consumers. | [Retired decision](ADR-17-chaos-e2e-strategy.md), frontend E2E files. | Historical design/isolated UI evidence, not current backend failure testing or production behavior. |

Unsupported contribution counts, project impact claims, and live-demo claims are
not published until a verifiable source is available.

## Copy and Density Budget

| Surface | Limit |
| --- | --- |
| Hero value proposition | 24 words maximum. |
| Featured project summary | 90 words maximum per project. |
| Engineering Proof | One desktop viewport. |
| Decision preview | 90 words maximum. |
| Engineering Principle | 26 words maximum. |
| About | Four lines maximum. |
| Case study | 700 words maximum. |

Technology names appear once in the Engineering Toolkit or in a project stack;
they are not repeated in the hero, About section, footer, and project summary.

## Content Ownership

| Content | Source of truth | Destination |
| --- | --- | --- |
| Identity and contact links | `/api/v1/about` | Hero, Contact, Footer. |
| Project records and case studies | `/api/v1/projects` | Featured Projects and project routes. |
| Operational status | `/api/v1/metrics/summary` | Production Snapshot and Production Evidence. |
| Architecture decisions | ADRs and decision configuration | Decision routes. |
| Telemetry presentation | Backend-confirmed observations through existing hooks, after frontend retirement. | Production Evidence only; no retired simulation claims. |

## Public Navigation

The user-facing routes are `/`, `/projects/:projectId`,
`/decisions/:decisionId`, and `/production-evidence`. Routes must be directly
refreshable on Vercel, keyboard reachable, and localized through the existing
EN/PT/ES content model.
