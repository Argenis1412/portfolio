# AGENTS.md — SRE Portfolio System

## Project

NADA DE CO-AUTOR NI EN COMMIT NI PR: Co-Authored-By: Codex Opus 4.6 <noreply@anthropic.com>  X
Cloud-Native SRE Portfolio System focused on resiliency, idempotency, and infrastructure automation.

- **Frontend:** React 19 + TypeScript + Vite + TanStack Query + Framer Motion + Tailwind CSS 4
- **Backend:** Python 3.12 + FastAPI
- **Infrastructure:** Terraform + Koyeb
- **Testing:** Vitest (unit) + Playwright (e2e)
- **QA:** ESLint + TypeScript + Husky + lint-staged

## Workflow

- **Golden Rule:** Implement the smallest correct change that satisfies all acceptance criteria.
- Unit of work is a self-contained issue with limited scope and verifiable criteria.
- Implement only what the issue requires. No unrelated refactors, no speculative improvements.
- Keep diffs minimal. Code, comments, commits, and PRs in English only.
- Stop and ask if anything is ambiguous.

### QA Before Every Commit

```bash
cd frontend
npm run lint
npx tsc -b
npm run test -- --run
```

Backend changes: `cd backend && pytest`

Do not create commits if QA fails.

### Branch Naming

```
<type>/<slug>
```

Types: `feat`, `fix`, `docs`, `refactor`, `chore`
Examples: `feat/chaos-retry-button`, `fix/log-stream-overlap`, `chore/terraform-secret-migration`

### Commits

Conventional commits only:

```
<type>(<scope>): <message>
```

Examples: `feat(ui): animated metrics sparkline transitions`, `fix(logs): prevent layout jump on rapid button press`

One logical change per commit. The user is the sole author of all commits.

### Pull Requests

No AI attribution in PRs. The user is the sole author.

### Testing

| Change type        | Tests required?                          |
|--------------------|------------------------------------------|
| Behavioral change  | Yes                                      |
| Bug fix            | Yes (regression test)                    |
| New feature        | Yes                                      |
| Documentation only | No, unless explicitly requested          |
| Pure refactor      | No (existing tests must pass)            |

### Implementation Rules

- Preserve existing style and architecture.
- Reuse existing patterns when possible.
- `frontend/src/hooks/useApi.ts` — single entry point for API data. Do not write `fetch`/`axios` directly in components.
- `useLiveMetrics`, `useChaosActions`, `useLog` — business hooks, never modify without a plan.
- UI components are presentational — no business logic inside.
- `ChaosContext` + `LogContext` manage global state — no new contexts without a plan.
- `TraceEmitter.ts` — single telemetry event emitter.
- Technical debt outside issue scope: document, do not fix.

### UI Animation Patterns

- Use Framer Motion `m.*` components for enter/exit/layout animations.
- Use `useReducedMotion()` from framer-motion to respect `prefers-reduced-motion`.
- Use CSS transitions/animations for GPU-accelerated properties (transform, opacity).
- Avoid animating layout-triggering properties (width, height, top, left).
- Virtual scroll for lists >25 items; `AnimatePresence` for smaller lists.

## Key Files

- `frontend/README.md` — frontend architecture and data fetching patterns
- `docs/architecture/*.md` — ADRs, incident case studies, SLO definitions
- `CHANGELOG.md` — full incident and release history
- `README.md` — project overview, infrastructure, and reliability model
