# Isolated single-process validation

This is a local reproduction, not a production benchmark or a release approval.
The [first attempt](results/8a73bb4/validation-status.md) was blocked by Docker
Desktop startup. No image or performance result was produced by that attempt.

The current infrastructure selects Koyeb's `free` instance. Its
[published budget](https://www.koyeb.com/docs/reference/instances) is 0.1 vCPU and
512 MB RAM. The commands below approximate that budget with Docker CPU throttling
and 512 MiB; they do not reproduce Koyeb scheduling, network, sleep, or disk limits.
Redis and the load generator are outside the API's resource limit. No external
email-provider latency is measured.

## Start a fresh isolated environment

Run from the repository root after `docker version` reports a working server.
Use these names only if they are unused; do not replace existing containers.
Do not pass an existing `.env`, production secrets, or persistent volumes.

```powershell
docker pull redis:7-alpine
docker build -f backend/Dockerfile -t portfolio-backend-validation:local .
docker network create --internal portfolio-validation-local
docker run -d --name portfolio-validation-redis --network portfolio-validation-local --network-alias redis redis:7-alpine
docker run -d --name portfolio-validation-api --network portfolio-validation-local `
  --cpus=0.1 --memory=512m --memory-swap=512m `
  -p 127.0.0.1:18080:8000 `
  -e ENVIRONMENT=production -e REDIS_URL=redis://redis:6379/0 `
  -e WORKER_ENABLED=true -e OTEL_ENABLED=false -e SENTRY_DSN= `
  -e RESEND_API_KEY= -e RESEND_TO_EMAIL= `
  -e METRICS_BASIC_AUTH_USERNAME=validation -e METRICS_BASIC_AUTH_PASSWORD=local-only `
  -e ALLOWED_ORIGINS=http://127.0.0.1:18080 `
  -e REGEX_ALLOWED_ORIGINS=^http://127[.]0[.]0[.]1:18080$ `
  portfolio-backend-validation:local
```

The image starts one Uvicorn process and its lifespan consumer. Empty Resend
configuration selects the console adapter; the internal network also isolates
container egress. The API binds only to host loopback. Credentials above are
public dummy values for this disposable environment only.

Wait until `(Invoke-RestMethod http://127.0.0.1:18080/health).status` is `ok`.
Inspect local logs if startup fails. Do not proceed on transport success alone.

## Run and inspect

```powershell
$validationResults = "benchmarks/results/$(git rev-parse --short HEAD)-local-$(Get-Date -Format yyyyMMdd-HHmmss)"
New-Item -ItemType Directory -Path $validationResults
k6 run --env RUN_ID=1 --env "SUMMARY_PATH=$validationResults/run-1.json" benchmarks/scripts/single_process_local.js
# Record the exit code and inspect every threshold, even if requests succeeded.
docker stats --no-stream portfolio-validation-api
docker exec portfolio-validation-redis redis-cli XPENDING contact_jobs email_workers
docker exec portfolio-validation-redis redis-cli XLEN contact_jobs_dlq
docker logs portfolio-validation-api
```

The group name above matches the default in `backend/app/worker.py`. A new
environment is required for a fresh baseline. For a second run in the same
environment, use `RUN_ID=2` and a different summary filename: run IDs separate
synthetic clients/dedup identities without clearing Redis. Do not reuse a run ID
while its rate-limit and deduplication state remains active.

The scenario has ten synthetic clients, eight iterations per client, three content
reads and a JSON health check per iteration, plus one stream contact per client.
Forwarded benchmark IPs emulate a proxy in this isolated compatibility-mode setup;
this does not verify strict production proxy trust. Pacing keeps each client's
shared read-limit hits below 20/minute within one run.

The script rejects remote targets, other ports, and invalid run IDs, and disables
redirect following. It checks exact success responses, production metrics auth,
and completion of ten console jobs using worker metrics. Latency thresholds retain
the read P95 <100 ms, health P99 <100 ms, and contact-acceptance P95 <200 ms targets.
Do not weaken thresholds to convert a failed run into a pass.

Record image ID, source commit, dirty changes, host/Docker/k6 versions, verified
container limits, request counts, latency quantiles, thresholds, restarts/OOM,
pending/DLQ state, and acknowledged console jobs. Worker success means console
processing here, not external email or inbox delivery. Inspect pending entries
and logs even when HTTP requests passed. Short local runs cannot establish a
30-day availability objective or production SLO compliance.

After retaining evidence, remove only the resources created above:

```powershell
docker rm -f portfolio-validation-api portfolio-validation-redis
docker network rm portfolio-validation-local
```

Keep the [release prerequisites](../docs/RELEASE_READINESS.md) open until actual
image and load evidence exists. Existing benchmark scripts/results remain
historical; this procedure does not change their recorded outcomes.
