# Portfolio Content Contract

## Purpose

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

The home page does not own interactive chaos controls, detailed traces, logs,
or full incident narratives. Those belong to `/production-evidence`.

## Evidence Rules

Every numerical or operational claim has one source and one classification:

| Classification | Meaning | Home-page behavior |
| --- | --- | --- |
| `REAL` | Verifiable production telemetry or a checked-in test/CI artifact. | May appear in the Production Snapshot with source context. |
| `REPRODUCED` | Controlled experiment that recreates a production-relevant behavior. | May appear in a case study with its environment stated. |
| `SYNTHETIC` | Deliberately simulated demonstration data. | Never presented as production data. |

The following evidence is currently supported by repository documentation:

| Claim | Source | Classification |
| --- | --- | --- |
| JSON-first static reads remove the PostgreSQL round trip. | `docs/architecture/JSON_FIRST_READ_PATH.md`, INC-002. | `REPRODUCED` / documented production incident. |
| Contact processing uses durable Redis Streams, retries, DLQ handling, and PEL recovery. | `ARCHITECTURE.md` ADR-20 and backend tests. | `REAL` implementation evidence. |
| CI enforces backend quality gates and an 80% coverage threshold. | README, backend README, GitHub workflows. | `REAL` repository evidence. |
| Chaos behavior is exercised locally in CI. | `docs/architecture/ADR-17-chaos-e2e-strategy.md`. | `REPRODUCED`. |

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
| Operational status | `/metrics/summary` | Production Snapshot and Production Evidence. |
| Architecture decisions | ADRs and decision configuration | Decision routes. |
| Interactive telemetry | Existing observability hooks | Production Evidence only. |

## Public Navigation

The user-facing routes are `/`, `/projects/:projectId`,
`/decisions/:decisionId`, and `/production-evidence`. Routes must be directly
refreshable on Vercel, keyboard reachable, and localized through the existing
EN/PT/ES content model.
