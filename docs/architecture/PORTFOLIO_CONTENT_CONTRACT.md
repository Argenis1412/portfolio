# Portfolio Content Contract

## Purpose

This is the retained content/design contract. Frontend Chaos controls and retired
metrics consumers have been removed; deployment remains unconfirmed. See the
[release prerequisites](../RELEASE_READINESS.md). JSON claims and list/detail
snapshots remain deliberate evidence boundaries.

The portfolio is a hiring artifact first and a system demonstration second.
Its home page must answer, in order: who the engineer is, what they build,
how to inspect their code and decisions, and how to contact them.

## Home Page Contract

The home page owns only this sequence:

1. Hero: identity, specialization, and hiring CTAs.
2. Featured Projects: Portfolio, Housing Finance GPS, Loja App, and PatchForge.
3. About: short biography, expandable skills, employment and education.
4. Contact: validated form and contact links.

The home page does not own detailed traces, logs, or full incident narratives.
The portfolio case study owns concise engineering cases with source reports and
explicit historical or local-experiment limits. The standalone production evidence
page is retired; its URL redirects to the portfolio case study. No public page
polls metrics. Interactive Chaos controls and synthetic traces remain retired.
Personal projects belong in Projects, not in the professional experience catalog.

## Evidence Rules

Every numerical or operational claim has one source and one classification:

| Classification | Meaning | Home-page behavior |
| --- | --- | --- |
| `REAL` | Verifiable production telemetry or a checked-in test/CI artifact. | Referenced from a project case study with source context. |
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
| Old Chaos scenarios remain in history; current frontend E2E fixtures exercise content, case reports, redirects, and contact. | [Retired decision](ADR-17-chaos-e2e-strategy.md), frontend E2E files. | Historical design/isolated UI evidence, not current backend failure testing or production behavior. |

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
| Architecture decisions | ADRs and decision configuration | Decision routes. |
| Documented engineering cases | INC-009 and the dated local load report | Portfolio case study, with source links and measurement limits. |
| Professional experience | `/api/v1/experiences` | About disclosure; excludes personal project entries. |

## Public Navigation

The user-facing routes are `/`, `/projects/:projectId`, and
`/decisions/:decisionId`. `/production-evidence` redirects to
`/projects/portfolio-api` with history replacement. Routes must be directly
refreshable on Vercel, keyboard reachable, and localized through the existing
EN/PT/ES content model.
