# Release Readiness

**Cleanup status: merge and deployment blocked by frontend retirement.** Passing
backend tests does not make the existing UI compatible with retired Chaos routes
and metrics fields. The [consumer list](../CHANGELOG.md#frontend-deployment-dependency)
and [operations runbook](architecture/production-operations.md) define remaining work.

## Validation boundaries

Before every commit, run backend pytest and frontend ESLint, `tsc -b`, and Vitest
as documented in the [root guide](../README.md#required-checks-before-a-commit).
Backend lint/format and gradual mypy configuration are documented in the
[backend guide](../backend/README.md#code-and-checks). Documentation-only changes
need link/history checks, not new behavioral tests.

CI jobs are separate, filtered workflows, not one universal release gate.
Backend/frontend pushes on `chore/backend-cleanup` do not match their configured
push branch filters, and root/docs-only changes do not match their code path
filters. A local pass or old badge does not prove this commit ran in GitHub Actions.
Check the event, commit, jobs, and artifacts before claiming CI success.

Playwright is a separate frontend smoke suite:

- Without `BASE_URL`, its configuration starts a local frontend and injects the
  production API base URL for reads. Local UI execution is not an isolated local
  backend test.
- With `BASE_URL`, no local server starts and `VITE_API_URL` is not injected by
  Playwright. The hosted frontend must already target the intended backend.
- Existing Chaos smoke tests intercept specific action requests and return
  fixtures. They test that UI contract, not availability or recovery of retired
  backend routes. Their interception is not a blanket guarantee that arbitrary
  future mutating requests cannot reach the configured API.
- Replace the remaining Chaos scenarios and validate the compatible frontend/API
  pair before release. Do not send real contact email as part of a documentation
  check; a live delivery smoke test requires explicit authorization.

The E2E workflow runs on matching frontend pushes to `main` or manual dispatch;
manual dispatch defaults to the production frontend URL. This cleanup does not
run that suite against production or claim a new Playwright result.

Manual UI review remains required for desktop/mobile layouts (including 390x844),
keyboard navigation, focus restoration, labels, contrast, and reduced motion.
These are validation criteria, not a record that this review has been completed.

## Backend and operational prerequisites

Portfolio JSON claims and the affected list/detail response snapshots have been
reviewed for backend cleanup. Other project records remain outside that review.
Keep future content changes tied to deliberate snapshot review.

1. Build the Docker image from repository-root context with a running daemon.
2. Run a deployment-sized load test for the single-process API/consumer setup.
3. Confirm `AMBIENTE` contains exactly `production` and Koyeb receives
   `ENVIRONMENT=production`; preserve secret/resource identities.
4. Verify external monitors using `/saude` or `/salud` before removing aliases.
   Inspect `/health` bodies because degraded JSON still returns HTTP 200.

These items remain pending. No production settings, secret values, infrastructure,
or monitor targets were changed or verified in this documentation block.
The [local Docker attempt](../benchmarks/results/8a73bb4/validation-status.md)
failed during Desktop startup, before building an image. The
[isolated procedure](../benchmarks/LOCAL_VALIDATION.md) and k6 scenario are prepared;
their runtime checks remain pending until the engine starts successfully.

## Evidence and discoverability

Use the [content contract](architecture/PORTFOLIO_CONTENT_CONTRACT.md#evidence-rules)
for `REAL`, `REPRODUCED`, and `SYNTHETIC` labels. Distinguish repository/test evidence
from production observations, and retain release/environment context. Historical
benchmarks are not current SLO compliance; see the
[SLO definitions](architecture/SLO_DEFINITIONS.md).

The SPA rewrite serves the same HTML shell for application routes. Static root
metadata does not provide route-specific social previews, HTTP 404 status, or
HTTP-level `noindex`. Those need a separately scoped rendering solution. The
sitemap lists static routes and omits API-driven project IDs. Do not turn a
transient API error into a claim that a dynamic resource does not exist.

Earlier wording remains available with `git show e7cd8a0:docs/RELEASE_READINESS.md`.
