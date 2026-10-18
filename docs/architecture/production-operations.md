# Backend Operations Runbook

This runbook describes the cleanup branch. **Deployment is blocked until the
frontend retirement is complete**; see the
[remaining consumers](../../CHANGELOG.md#frontend-deployment-dependency).
A working local backend does not establish compatibility with the current UI.

## Configuration and deployment prerequisites

Use the [backend configuration reference](../../backend/README.md#configuration)
and the shared [environment example](../../.env.example). The application expects
`ENVIRONMENT=production`, Redis, metrics Basic Auth credentials, and restricted
CORS origins. Resend delivery also needs its API key and sender/recipient settings.
SQL configuration and migrations are no longer part of application startup.

GitHub Actions passes secret values to Terraform; Terraform configures Koyeb.
Internal identities such as `AMBIENTE` remain stable while the application receives
English keys such as `ENVIRONMENT`. Confirm that the GitHub secret `AMBIENTE`
contains exactly `production` and verify the resulting application setting before
any future deployment. Do not rename secret identities, remove existing database
resources, or edit managed Koyeb settings as part of this cleanup.

Before a separately authorized release:

1. Complete frontend retirement and deliberately review JSON content snapshots.
2. Run the backend and frontend checks in the [root guide](../../README.md#required-checks-before-a-commit).
3. Build the Docker image with a running daemon and run a deployment-sized load
   test for the single-process API/consumer configuration. Both remain pending.
4. Verify monitor targets before removing `/saude` or `/salud`; both remain active.
5. Review the Terraform plan and preserve existing resource/secret identities.
   The infrastructure workflow applies on pushes to `main`; keep this work on
   the cleanup branch until the release is approved.

## Runtime and health signals

Docker runs one Uvicorn process. `WORKER_ENABLED=true` starts the Redis Streams
consumer inside the API lifespan. Each consumer has a unique identity; shutdown
allows up to five seconds before cancellation and closes its Redis connection.
Pending jobs remain available for stream recovery. There is no separate worker
command or Compose worker service.

| Signal | What it establishes | What it does not establish |
|---|---|---|
| `/live` | The process responds. | Content availability or external provider health. |
| `/health` | Required JSON files are readable, parseable, and have expected top-level types; optional sidecar checked when present. Email configuration is informational. | Redis/Resend connectivity, inbox delivery, or validity of every content field. |
| `/metrics` | HTTP and worker telemetry for this API process. Basic Auth is required in production. | Aggregated metrics across replicas. |
| `/api/v1/metrics/summary` | Observed latency, request/error counts, uptime, and derived status. | Retired simulation state or proof that a contact message was delivered. |

`/health` returns HTTP 200 even when `status="degraded"`; inspect the body and
`details.data_details`. The deprecated `/saude` and `/salud` routes return static
liveness-style responses, not the JSON checks performed by `/health`.

## Triage

| Symptom | First checks |
|---|---|
| `/live` unavailable | Confirm the failing target, network, deployment/startup logs, and restart/OOM evidence before choosing recovery. |
| `/health` degraded | Inspect per-file results and the deployed content artifact. Redeploy corrected content if needed; rotating Redis credentials cannot repair a missing JSON file. |
| Content route returns 500 | Inspect application errors and JSON content. A failed stack read returns 500 rather than a successful empty stack. |
| Redis errors | Check provider availability, configured URL, connection limits, and timeouts. Contact protection falls back to local memory; read-only rate limits fail open. |
| Contact accepted but not received | Check delivery mode, worker logs, pending/retry/DLQ state, and Resend configuration. HTTP 200 acknowledges acceptance, not inbox delivery. |
| Elevated 5xx or latency | Correlate deployment version, traffic, Sentry, process metrics, and logs. Compare against version-appropriate SLOs and baselines. |

When Redis is unavailable, memory fallback is limited to one process and resets
on restart. It cannot provide distributed idempotency or shared rate limits.
A Redis `SET NX` refusal remains a conflict; it does not activate a local lock.

For contact delivery, transient Resend errors receive up to three retries,
unknown errors one, and permanent errors none. Jobs older than 15 minutes are not
requeued. Retry/DLQ publication precedes acknowledgment. Background fallback logs
failure without automatic retries. See the
[backend guide](../../backend/README.md#code-and-checks) for classification details.

Alert rules must reflect these signals. Track HTTP failures/latency, Redis
fallbacks, and worker delivery failures with defined windows and routing. Treat
thresholds in older documents as proposals or historical configuration until
verified against the actual monitors; `/health` alone cannot alert on Redis or
Resend outages.

## Recovery and secret rotation

For a confirmed deployment regression, identify the last known-good release and
use the established deployment workflow to restore a compatible frontend/backend
pair. Review resource changes before applying a rollback; do not assume rolling
back an image also rolls back Terraform or secret values. Validate `/live`, the
`/health` body, protected metrics, and delivery evidence after recovery. A real
contact smoke test requires explicit authorization because it sends email.

For an exposed credential, rotate at the provider, update its existing GitHub
secret, and propagate it through the Terraform/Koyeb workflow. Verify the old
credential is inactive. Do not commit or log credential values. Database cleanup
and credential retirement for retained infrastructure are separate operations.

Record detection, affected release, impact, timeline, evidence, recovery, and
follow-up actions. Preserve historical incident reports rather than rewriting
past behavior to match the new design.

## Tracing

`OTEL_ENABLED=false` disables OpenTelemetry instrumentation and export without
disabling Prometheus or Sentry. With OpenTelemetry enabled, an empty
`OTLP_ENDPOINT` disables export in production and uses console export elsewhere.
Use an accessible OTLP/HTTP collector for Jaeger/Tempo; Sentry uses its own SDK
configuration and must not be configured as the OTLP endpoint.
