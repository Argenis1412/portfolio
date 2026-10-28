# Historical Local API/Consumer Validation

**Source:** [f9eaa7f](https://github.com/Argenis1412/portfolio/commit/f9eaa7f0db13348818193c131d59340aa4277766).
**Recorded date:** 2026-10-17 America/Sao_Paulo / 2026-10-18 UTC.
**Classification:** REPRODUCED. **Result:** image build passed; both load runs
failed latency thresholds (k6 exit 99).

## Environment

[environment.json](environment.json) retains image/base/Redis identities, Docker
versions, resource limits, health, worker counters, and exit codes. The root-context
build used Python 3.12.15. Its transitive dependency resolution can differ in a
future rebuild.

The measured API used one Uvicorn process and lifespan consumer, 0.1 CPU, 512 MiB
memory/memory-swap limits, production mode, port 18080, and dummy metrics credentials.
Resend was empty, selecting console delivery in that source. k6 1.7.1 shared the
API network namespace outside its cgroup; the internal network published no API
port. The image healthcheck was disabled for the port override; explicit JSON
health checks passed. No real email was sent.

Two sequential runs used distinct run IDs without restarting the measured API or
resetting Redis. Each had ten clients, eight paced iterations, 320 scenario GETs,
ten contact POSTs, and four setup/teardown requests: 334 requests total. This was
a short local workload, not a throughput limit or production availability study.

## Results

| Metric (ms) | Run 1 | Run 2 | Target |
|---|---:|---:|---|
| About P95 | 701.30 | 595.54 | <100 |
| Projects P95 | 487.17 | 390.29 | <100 |
| Stack P95 | 296.07 | 199.64 | <100 |
| Health P95 (informational) | 601.13 | 805.38 | P99 <100 failed both runs |
| Contact acceptance P95 | 708.22 | 1050.64 | <200 |
| Checks passed | 334/334 | 334/334 | All |
| Unexpected HTTP failures | 0 | 0 | 0 |
| Console jobs completed | 10 | 10 | 10 per run |

Raw summaries: [run-1.json](run-1.json), [run-2.json](run-2.json).
The health P99 threshold failed, but the summaries retain numeric quantiles only
through P95. The expected unauthenticated metrics 401 was checked separately and
excluded from unexpected failures.

The final worker success counter was 20; pending/lag and DLQ length were zero.
Two consumer records include an earlier port-8000 startup and its replacement,
not two concurrent measured workers. JSON health stayed `ok`; email configuration
remained `pending`. No restarts/OOM occurred. Memory peak was 73,695,232 bytes
(70.28 MiB); process-lifetime snapshots also show CPU throttling, without isolating
all latency causes.

## Limits

Functional success did not satisfy latency acceptance. This report applies to its
recorded source and budget. Current production startup requires Resend settings
and cannot run this console scenario unchanged; see
[current validation limits](../../README.md#current-validation-limits).
The retained artifacts contain no 1-CPU comparison or current deployment proof.
A compatible harness and fresh passing evidence are needed for current capacity claims.
