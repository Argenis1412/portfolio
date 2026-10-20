# Engineering Playbook

Development rules for the cleanup branch. Repository instructions in `AGENTS.md`
and explicit task scope govern the work. **Do not merge or deploy this branch**
until the [frontend dependencies](CHANGELOG.md#frontend-deployment-dependency)
are retired and release prerequisites are met.

## Scope, branches, and commits

Implement the smallest correct change with verifiable criteria. Keep unrelated
refactors and speculative improvements out of the diff. Record out-of-scope debt
without fixing it. Resolve ambiguity before dependent changes.

Use `feat/`, `fix/`, `docs/`, `refactor/`, or `chore/` plus a short English slug.
Commits follow `type(scope): description`, with one logical change per commit.
The repository owner is the sole author; do not add additional author trailers.
Code, comments, commits, PRs, and engineering documentation use English; localized
portfolio content is a separate concern. Preserve unrelated working-tree files.

Prepare PRs around the problem, resulting behavior, scope, validation, and known
limits. Review the complete diff for intent before reviewing individual lines.
Passing checks do not authorize a merge or deployment. Do not assume repository
merge settings, branch protection, or workflow execution from historical prose.

## Checks before every commit

Activate the Python 3.12 backend environment with both requirements files installed.
From `backend/`:

```bash
python -m ruff check .
python -m ruff format --check .
python -m mypy --config-file pyproject.toml
python -m pytest
```

From `frontend/`:

```bash
npm run lint
npx tsc -b
npm run test -- --run
```

Do not commit if a required check fails. Fix the failure or distinguish a proven
environment limitation and rerun the affected check successfully. Report commands
actually executed; do not treat a workflow badge as evidence for an unchecked SHA.
Docker builds and deployment-sized load tests remain separate pending release gates.

Mypy checks all of `app/` with the shared gradual configuration. Unannotated
function bodies are not generally checked; a clean result is not strict typing.
Do not hide errors with new ignores or update dependencies/stubs without evaluating
the scope. The optional pre-commit entry uses the active backend environment;
the active Husky hook currently runs frontend lint-staged tasks only. See the
[backend guide](backend/README.md#code-and-checks) for commands and configuration.

## Tests and completion criteria

| Change | Required evidence |
|---|---|
| Behavior, feature, or bug fix | Meaningful tests for the changed behavior; reproduce a bug before fixing it when feasible. |
| Pure refactor | Existing tests pass; preserve observable behavior. |
| Documentation only | No new tests required; verify claims, local links, and historical boundaries. Commit checks above still apply. |
| JSON/response mapping | Deliberate content-snapshot review; do not regenerate expected output without checking the change. |

Pytest enforces 80% coverage. Use deterministic fixtures and mocked external
services where appropriate. Doubles at repository/email boundaries are compatible
with injected use cases. Tests configure Redis, worker, Sentry, and OpenTelemetry
before application imports; production code must not detect pytest.

A block is complete when its criteria and required checks pass, its diff is
reviewed, configuration changes are documented, and remaining limitations are
explicit. A local test result does not prove a production deployment, inbox
delivery, or load capacity. Keep public interfaces documented and describe
non-obvious decisions with their context, consequences, and status.

## Architecture and API review

Follow the [implemented boundaries](ARCHITECTURE.md#current-backend-design).
Controllers compose dependencies and map HTTP responses; use cases accept injected
adapters. Domain/framework boundaries have architecture tests. Avoid introducing
new persistence layers, global state, or services without a scoped plan.

Portfolio routes use `/api/v1/`; `/live`, `/health`, `/metrics`, and deprecated
health aliases have separate operational purposes. Idempotency is optional for
contact submission, with standard and legacy headers. Completed responses replay;
concurrent requests receive 409. Validation, duplicate-content, and rate-limit
failures remain observable errors; only honeypots silently accept/drop requests.

Review compatibility with consumers before changing responses. Current collection
routes serve finite checked-in content without pagination. If dynamic/unbounded
collections are introduced, design limits explicitly rather than documenting
pagination that does not exist. Production errors use existing handlers; debug
mode can return diagnostic tracebacks and must remain disabled in production.

## Logging, security, and dependencies

Use the structured logger and request context. Request logs include request IDs,
path, method, status, and duration; trace IDs are conditional on an active span.
Email masking is shared and preserves at most one local-part character. Phone
masking applies to the recognized structured field. These processors do not scrub
all arbitrary strings, contact bodies, names, or exception messages: choose log
fields deliberately and keep secrets/PII out of artifacts and exported telemetry.

Production `/metrics` requires Basic Auth. Check CORS, CSP, proxy trust, and header
behavior against the actual settings and middleware when changing browser access.
Do not document a security guarantee based only on a middleware class name.

Keep existing production dependency pins. Before adding a package, assess whether
current dependencies suffice, maintenance, image impact, configuration, and typing.
Use the shared `.env.example`; store real credentials outside Git. For exposed
credentials, follow the [rotation runbook](docs/architecture/production-operations.md#recovery-and-secret-rotation).

## Performance and reliability

Use [SLO definitions](docs/architecture/SLO_DEFINITIONS.md) for targets and recorded
benchmarks for evidence tied to a version, environment, time window, and sample
size. Describe cold starts and low-volume histogram uncertainty without waiving
targets. The current single-process API/consumer configuration needs a fresh load
test; older latency figures are not its baseline.

Document caching, invalidation, and fallback limits. JSON reads cache on demand
until restart; `/health` bypasses that cache. Redis provides shared protection
state; in-memory fallback is process-local and resets on restart. Redis lock
contention is distinct from a Redis exception.

Redis Streams support at-least-once processing, not a promise that delivery can
never fail or duplicate. Retry/DLQ publication precedes acknowledgment. Background
fallback has no automatic retries. Use the backend guide for current retry
classification/limits and the operations runbook for incident triage.

## Infrastructure and release boundaries

GitHub Actions supplies secret values to Terraform, which manages Koyeb. Preserve
stable resource/secret identities and existing moved blocks; unexpected destruction
requires investigation before any apply. Do not infer current provider restrictions
or organization quotas from old incidents. HCP workspace execution settings and
live provider state must be verified when relevant; they are not established by
local source review.

Application SQL retirement does not remove external databases, volumes, or their
credentials. Database migrations, soft-delete policies, and standalone worker
provisioning from older playbooks are not current application procedures.

Use the [operations runbook](docs/architecture/production-operations.md) for release
prerequisites and recovery. This cleanup does not authorize resource deletion,
secret renaming, production email tests, merge, or deployment.

## Incidents and evidence

Preserve significant incidents with affected version, observed impact, detection,
timeline, initial hypotheses, evidence, root cause when established, mitigation,
accepted limitations, and follow-up. Keep reports factual and blameless. Do not
rewrite past observations to match the current implementation.

Label evidence `REAL`, `REPRODUCED`, or `SYNTHETIC`, with source and limitations.
A synthetic UI trace is not an actual backend HTTP response. Avoid universal claims
from sparse data or fixed quotas for metrics/case studies when evidence is missing.

The former completed roadmap and original playbook are available with
`git show 615c9a5:ENGINEERING_PLAYBOOK.md`. Their completion marks apply to earlier
work and do not close current release gates. Use [CHANGELOG](CHANGELOG.md) for
release/incident history; detailed architecture documents and portfolio JSON still
need their separate consistency review.
