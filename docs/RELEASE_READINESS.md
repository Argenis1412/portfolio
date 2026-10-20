# Release Readiness

**Cleanup status: frontend retirement implemented; deployment and capacity remain unverified.**
Backend tests and isolated frontend tests do not establish that the compatible
frontend is deployed or that the deployed backend serves an exact commit.

## Validation boundaries

Before every commit run frontend ESLint, `tsc -b`, Vitest, and backend pytest.
Also build the frontend and run the isolated Playwright smoke. The existing
translation-parity test checks EN/PT/ES and runs explicitly in the E2E workflow.
A local pass is not a GitHub Actions result; verify the event, SHA, jobs and artifacts.

Playwright starts a local frontend with a fictitious API origin unless `BASE_URL`
is supplied. With `BASE_URL`, it loads the hosted UI and intercepts its compiled
API target through `/api/v1/` paths on any origin. Content and metrics use fixtures;
contact uses fake acceptance or error responses. Unexpected API calls and mutations
fail validation; other origins, including Sentry, are aborted, service workers are
blocked, and external WebSockets are closed; same-origin WebSockets remain available
for the local development server. Requests must not include `X-Chaos-Preset`.
No test sends a real email. This suite checks
UI behavior, not production API reachability or delivery.

The workflow runs for matching frontend/workflow pushes to `main`, pull requests
**targeting `main`**, and manual dispatch. Empty manual `base_url` means local execution;
a supplied URL selects a hosted UI under the same interception policy. Its only
permission is `contents: read`; no secrets are required. A stacked PR targeting
the retirement branch does not match the `pull_request` base filter until retargeted.
Manual dispatch can validate each PR branch before integration. Both branches use
local execution by default, and the smoke command disables retries so a passing
run cannot conceal a flaky first attempt.

Metrics retain previous validated values during failed refreshes for less than
60 seconds; at 60 seconds they show no current data, preserve the last receipt
time, and retain only explicitly historical charts. Invalid responses do not
renew freshness. Both backend contracts are accepted without strict unknown-key
rejection; invalid shared states are rejected instead of becoming healthy defaults.
Latency and request counters must be nonnegative integers; error rates must be
between zero and one. A failed refresh immediately withdraws the current operational
status and suppresses new threshold alerts, even while previous values remain
visible below 60 seconds. Expired cached readings are hidden from the first render.
Returning to a visible tab refreshes stale queries without waiting for the next poll.

Local validation passed ESLint, TypeScript, Vitest and the frontend build; backend
pytest passed 341 tests with 3 real Redis integrations skipped (90.57% coverage).
The isolated Chromium suite covers both API contracts, freshness, fake contact,
network blocking, and keyboard focus. Desktop (1440x1000) and mobile (390x844)
metrics screenshots were reviewed in light/dark themes with reduced motion; no
horizontal overflow was observed. These checks do not establish a complete WCAG
audit, cross-browser support, live delivery, or production behavior.
Validation evidence and remaining visual-review limits are recorded in the draft PRs.

Safe HTTP observations on 2026-10-20: `/health` returned 200 with version `1.9.2`
and `details.data`; GET `/api/v1/chaos/spike` returned 404. These are compatible
with the new backend, not proof that `d0d1cea` is deployed. New frontend deployment
remains unconfirmed. Keep the backend `X-Chaos-Preset` CORS permission until that
frontend is confirmed deployed and old tabs/bundles have been considered.

## Backend and operational prerequisites

Portfolio JSON claims and the affected list/detail response snapshots have been
reviewed for backend cleanup. Other project records remain outside that review.
Keep future content changes tied to deliberate snapshot review.

1. Docker image build from repository-root context: complete in local validation.
2. Deployment-sized single-process API/consumer load: executed twice; latency
   acceptance failed. Local comparison with the same image failed twice at 0.1 CPU
   and passed twice at 1 CPU. The current budget remains unaccepted; resolve
   capacity and obtain a passing rerun before release.
3. Confirm `AMBIENTE` contains exactly `production` and Koyeb receives
   `ENVIRONMENT=production`; preserve secret/resource identities.
4. Verify external monitors using `/saude` or `/salud` before removing aliases.
   Inspect `/health` bodies because degraded JSON still returns HTTP 200.

The [local results](../benchmarks/results/f9eaa7f-local-20261017/README.md) retain
image/resource evidence and both failed latency summaries. All 334 functional
checks per run passed, with twenty total console jobs and no pending/DLQ entries.
This does not establish production SLO compliance. The earlier
[startup failure](../benchmarks/results/8a73bb4/validation-status.md) is historical;
the [isolated procedure](../benchmarks/LOCAL_VALIDATION.md) now uses container-local
k6 networking. Production environment and monitor verification remain pending;
no production settings, secret values, infrastructure, or monitor targets changed.

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
