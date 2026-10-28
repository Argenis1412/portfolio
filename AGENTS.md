# AGENTS.md — Backend Portfolio

React/TypeScript portfolio with a FastAPI backend, JSON content, Redis Streams,
and Resend. Start with [README.md](README.md); component guides provide details.

## Workflow

- Implement the smallest correct change with verifiable acceptance criteria.
- Preserve existing patterns and unrelated working-tree changes. Report debt
  outside the task instead of fixing it. Clarify material ambiguity before editing.
- Write code, comments, documentation, commits, and PRs in English. Portfolio
  content supports EN/PT/ES.
- Use `feat/`, `fix/`, `docs/`, `refactor/`, or `chore/` branch prefixes.
- Use conventional commits: `type(scope): description`, one logical change each.
- The user is the sole author of commits and pull requests. Do not add co-authors,
  `Co-Authored-By` trailers, or AI attribution.

## Validation

Before every commit, from `frontend/`:

```bash
npm run lint
npx tsc -b
npm run test -- --run
```

For backend changes, run Ruff, mypy, and pytest as documented in
[backend/README.md](backend/README.md#code-and-checks). Do not commit with failed QA.

Behavior changes and features need tests; bug fixes need regression coverage.
Refactors must preserve existing tests. Documentation-only changes need claim,
link, and path validation, without new application tests. Review public content
snapshot changes deliberately; passing tests do not prove production deployment.

## Implementation boundaries

- Keep HTTP calls in `frontend/src/api/` and expose queries/mutations through
  `frontend/src/hooks/useApi.ts`. Put business behavior in hooks/services.
- Plan changes to business hooks, including `useLiveMetrics`, `useContactForm`,
  and `useLog`, and additions to global context before implementation.
- Prefer Framer Motion `m.*` with the existing `LazyMotion` setup. Respect
  reduced motion and use transform/opacity for movement; avoid layout animations
  that trigger repeated reflow. Reuse existing list and disclosure patterns.
- Keep backend controllers, injected use cases, entities, and adapters within
  their existing boundaries; see [ARCHITECTURE.md](ARCHITECTURE.md).
- Preserve Terraform resource/secret identities and moved blocks. Review plans
  before applying; application SQL removal does not authorize resource deletion.
- Use [operations](docs/architecture/production-operations.md) for release and
  recovery checks. Production changes and real email tests need explicit scope.
