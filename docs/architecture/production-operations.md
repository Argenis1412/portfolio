# Backend Operations Runbook

Use the [backend guide](../../backend/README.md) for API/configuration/fallback
behavior and [infrastructure guide](../../infrastructure/README.md) for deployment
ownership. Repository implementation and a running production release are separate
verification boundaries.

## Release checks

The [v1.9.2 release](../../CHANGELOG.md) is complete and tagged as `v1.9.2`.
For subsequent releases:

1. Run frontend/backend checks from their guides, build the frontend, and run the
   isolated Playwright suite. Review public JSON snapshots deliberately. Local
   fixtures do not establish live email delivery or deployed API compatibility.
2. Build `backend/Dockerfile` from the repository root for the intended commit.
   The retained [image/load experiment](../../benchmarks/results/f9eaa7f-local-20261017/README.md)
   applies to its recorded source only. Both runs failed latency thresholds;
   current capacity needs a compatible harness and passing evidence.
3. Verify the existing GitHub secret `AMBIENTE` is exactly `production` and Koyeb
   receives `ENVIRONMENT=production`. Check Redis, metrics credentials, nonblank
   Resend key/recipient, CORS, frontend API URL, and CSP without exposing values.
4. Drain legacy API instances before relying on token-owned idempotency. Verify
   managed Redis permits script loading/execution. Avoid overlapping incompatible
   reservation writers.
5. Review the Terraform plan and preserve resource/secret identities. The workflow
   applies on main pushes. Confirm a compatible frontend/backend pair and record
   actual deployed commits; merging alone does not establish that state.
6. Verify external monitor targets before removing `/saude` or `/salud`. Check
   deployed/cached frontend clients before removing the ignored `X-Chaos-Preset`
   CORS allowance. Both compatibility surfaces remain in code.

This runbook does not record current deployed commits, secret values, provider
permissions, external monitors, or production capacity. A release tag does not
replace these operational checks.

## Runtime and health signals

Docker runs one Uvicorn process. With Redis configured and `WORKER_ENABLED=true`,
the API lifespan starts one uniquely identified Streams consumer per instance.
The consumer is supervised with restart backoff; shutdown allows up to five
seconds before cancellation and connection cleanup. There is no standalone worker
command or Compose worker service. Disabling the consumer does not disable enqueue.

| Signal | What it establishes | Limit |
|---|---|---|
| `/live` | Process response. | No content/provider checks. |
| `/health` | JSON readability, syntax, expected top-level types, version/uptime, and email configuration. | HTTP 200 can contain `status="degraded"`; inspect `details.data_details`. No Redis/Resend connectivity checks. |
| `/metrics` | HTTP/worker telemetry for this process. | Production Basic Auth; no cross-replica aggregate. |
| `/api/v1/metrics/summary` | Observed latency, request/error counters, status, and uptime. | No rolling SLO or delivery confirmation. |

Deprecated health aliases return static liveness-style bodies. See
[observability](observability.md) for excluded metric routes and logging limits.

## Triage

| Symptom | First checks |
|---|---|
| `/live` unavailable | Target/network, deployment/startup logs, restarts, and OOM evidence. |
| `/health` degraded or content 500 | Per-file results, application errors, and deployed JSON artifact. Cached content can differ from uncached health checks. |
| Redis failures | Provider availability, connection limits, configured URL/timeouts, local fallback events, and worker supervisor state. |
| Contact accepted but absent | Delivery mode, consumer state, pending/retry/DLQ records, and provider configuration/evidence. A honeypot can be accepted without delivery. |
| Elevated latency/5xx | Release/traffic changes, process metrics, logs, and Sentry; compare equivalent workloads and budgets. |

Inspect stream `contact_jobs`, group `email_workers`, and DLQ `contact_jobs_dlq`
using authorized read-only tooling. Avoid logging payloads/credentials or manually
replaying messages without reviewing duplicate-delivery risk. Retry/DLQ publication
precedes ACK; accepted work in background fallback is non-durable and has no
automatic retries. Exact retry/age limits are in the
[backend guide](../../backend/README.md#reliability-and-failure-behavior).

## Recovery and secret rotation

For a confirmed regression, identify the last known-good compatible pair and use
the deployment workflow to restore it. Image rollback does not roll back Terraform
or secret values. Review resource changes before applying recovery; validate
`/live`, the health body, protected metrics, and delivery evidence afterward.
A real contact smoke test sends email and needs explicit authorization.

For exposed credentials, rotate at the provider, update the existing GitHub
secret, propagate through Terraform/Koyeb, and verify the old value is inactive.
Keep values out of Git/logs. External database/resource retirement is separate.
Record detection, impact, commit, evidence, recovery, and follow-up in the existing
incident/release history.
