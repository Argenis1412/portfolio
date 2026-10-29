# Benchmarks

Checked-in k6 scripts define workload-specific targets and archive experimental
results. They do not establish production SLO compliance. The retained
[local report](results/f9eaa7f-local-20261017/README.md) includes image/resource
metadata and two raw summaries; both runs failed latency thresholds.

## Scripts and evidence

The [frontend phase 1 report](results/frontend-phase1-20261029/README.md) retains
Lighthouse comparisons, visual comparison results, per-commit QA output and
hosted cache/image checks. Its local results do not establish production SLOs.

| File | Purpose |
|---|---|
| [health.js](scripts/health.js) | Local health steady-state and ramp scenarios. |
| [read_path.js](scripts/read_path.js) | Content-read baseline/stress scenarios. |
| [contact.js](scripts/contact.js) | Contact, abuse, and honeypot scenarios; can trigger real delivery. |
| [single_process_local.js](scripts/single_process_local.js) | Loopback-only API/consumer experiment with console jobs and production metrics-auth checks. |
| [run.ps1](run.ps1) | Legacy PowerShell runner and generated summaries; inspect individual k6 results instead of trusting generated pass counts. |

For an already running disposable local API, a health-only run from the repository root:

```bash
k6 run --env BASE_URL=http://127.0.0.1:8000 benchmarks/scripts/health.js
```

See [configured thresholds and measurement rules](../docs/architecture/SLO_DEFINITIONS.md).
Keep source commit, resource budget, request counts, raw results, and exit codes
with any future run. Contact load against a real provider requires explicit scope
to send email; no production load or email was performed by this audit.

## Current validation limits

The [recorded source settings](https://github.com/Argenis1412/portfolio/blob/f9eaa7f0db13348818193c131d59340aa4277766/backend/app/settings.py)
permitted production mode with empty Resend settings and console delivery.
Current startup rejects missing production Resend key/recipient,
while a nonempty key selects the real provider. Switching to non-production mode
also removes the metrics-auth behavior expected by `single_process_local.js`.
A separately scoped harness change is required before presenting that experiment
as reproducible against current source. Do not bypass startup checks or weaken
thresholds to make it pass.

Older generated summaries without their raw JSON have been removed. The remaining
`parse_results.py` helper still hardcodes an absent legacy `health.json` input;
it requires separate tooling work before reuse. The dated report and its JSON
remain historical evidence. Current deployment and capacity checks are in the
[operations runbook](../docs/architecture/production-operations.md#release-checks).
