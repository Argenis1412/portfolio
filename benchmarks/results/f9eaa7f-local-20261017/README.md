# Isolated single-process validation

**Source:** `f9eaa7f0db13348818193c131d59340aa4277766`.
**Date:** 2026-10-17 America/Sao_Paulo / 2026-10-18 UTC.
**Classification:** REPRODUCED. **Result:** image build passed; both load runs
failed latency thresholds (k6 exit 99). Capacity acceptance remains open.

## Environment and execution

The root-context build completed with the committed Dockerfile and allowlist.
Its transferred runtime context was 237.84 kB. Image identity, base/Redis digests,
Docker versions, resource settings, health, and counters are retained in
[environment.json](environment.json). The build used Python 3.12.15 and installed
the current resolution of runtime requirements; unpinned transitive dependencies
can differ in a future rebuild.

Docker Desktop became available after the user reported updating it. The earlier
[blocked attempt](../8a73bb4/validation-status.md) remains historical. The first
container used the image's default port 8000 and became healthy, with one Uvicorn
process, but its internal network did not expose the requested host port:
`HostConfig.PortBindings` contained 18080 while `NetworkSettings.Ports` was empty.
No load ran against that container. It was stopped and replaced; Redis remained.

The measured API used the same image, one Uvicorn process and lifespan consumer,
0.1 CPU, 512 MiB memory and memory-swap limit, production settings, and dummy
metrics credentials. Only its port changed to 18080. The image healthcheck was
disabled for that port override; explicit JSON health checks passed before and
after load. k6 1.7.1 ran in a separate container sharing the API network namespace,
outside the API CPU/memory cgroup. The internal network had no published API port.
Resend configuration was empty: all jobs used console delivery, with no real email.
See the corrected [procedure](../../LOCAL_VALIDATION.md).

Two sequential runs used distinct `RUN_ID=1` and `RUN_ID=2`, without resetting
Redis, restarting the measured API, or relaxing thresholds. Each used ten clients,
eight paced iterations, 320 scenario GETs and ten contact POSTs. Setup/teardown
added four requests: 334 total per run. This short workload is not a maximum
throughput test or a production/30-day SLO measurement.

## Results

| Metric (ms) | Run 1 | Run 2 | Required |
|---|---:|---:|---|
| About P95 | 701.30 | 595.54 | <100 |
| Projects P95 | 487.17 | 390.29 | <100 |
| Stack P95 | 296.07 | 199.64 | <100 |
| Health P95 (informational) | 601.13 | 805.38 | P99 <100 failed both runs |
| Contact acceptance P95 | 708.22 | 1050.64 | <200 |
| Checks passed | 334/334 | 334/334 | All |
| Unexpected HTTP failures | 0 | 0 | 0 |
| Console jobs completed | 10 | 10 | 10 per run |

Full summaries: [run-1.json](run-1.json), [run-2.json](run-2.json).
k6 evaluated the health P99 threshold, but its default summary retains numeric
quantiles only through P95; no exact health P99 value is claimed here. The expected
unauthenticated metrics 401 was checked explicitly and excluded from HTTP failures.

The final worker success counter was 20, Redis group pending/lag were zero, and
the DLQ length was zero. Two Redis consumer records reflect the initial port-8000
startup and its replacement, not two concurrent measured workers. JSON health
remained `ok`; email configuration correctly remained `pending` for console mode.
There were no API restarts or OOM events. Cgroup memory peak was 73,695,232 bytes
(70.28 MiB); Docker stats are point samples, not peaks. The second CPU snapshot
recorded 438 throttled periods out of 679 and 46,037,546 microseconds throttled.
These process-lifetime observations include startup and idle time, not just run 2.
CPU throttling was observed; this test does not isolate every source of latency.

Required QA passed: 311 backend tests, 89.54% coverage, 101 frontend tests,
ESLint and TypeScript. No application code or latency thresholds were changed.
After retaining evidence, only the two validation containers and their internal
network were removed. Local images/build cache remain available.

## Remaining acceptance

The Docker build prerequisite is complete and deployment-sized load was executed.
The measured workload does not meet its latency targets under this local budget.
A separately scoped profiling/capacity decision and a passing rerun are required
before claiming these performance targets. Frontend retirement, production
environment verification, and external monitor checks remain release prerequisites.
