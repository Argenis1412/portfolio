# CPU budget comparison

**Classification:** REPRODUCED. **Date:** 2026-10-18 America/Sao_Paulo
(2026-10-19 UTC). **Checkout:** `f7975d84ba0bdbca4a2e91964b91415230bd6d26`.
**Runtime image source:** `f9eaa7f0db13348818193c131d59340aa4277766`.

The same image fails all five latency thresholds at 0.1 CPU and passes them at
1 CPU, twice each. This is a capacity diagnostic, not acceptance of the current
deployment budget. The [original failed runs](../f9eaa7f-local-20261017/README.md)
remain unchanged. No application optimization or production change was made.

## Controls and evidence

The [runner](../../scripts/cpu_comparison.ps1) used the original image
`sha256:298141ec2088e76c96b5a76320392c7448c7356f797ba53627ccaecdf2bc9122`.
No rebuild, dependency update, scenario edit, or threshold change occurred.
[environment.json](environment.json) records Docker/host/image identities and
scenario/runner hashes as executed. After execution, the runner was hardened to
reject existing result directories, accept a fresh output path, and use tracked
stdout filenames. Retained stdout files were renamed accordingly.

Runs used 0.1, 1, 1, and 0.1 CPU, in that order, with 512 MiB memory and swap limit,
fresh API/Redis containers for every run, one Uvicorn process and its lifespan
consumer. Each passed JSON readiness followed by five seconds settling time.
Content caches were not prewarmed. The unchanged scenario used ten clients, eight
paced iterations per client, and ten contacts. Fresh Redis avoids rate-limit and
deduplication carryover; run IDs were 1 through 4.

Other settings followed the [isolated procedure](../../LOCAL_VALIDATION.md):
production mode, dummy metrics credentials, Sentry/OTel disabled, empty Resend
configuration, console delivery, internal network, no published ports, k6 1.7.1
sharing the API network namespace outside its cgroup, and Redis outside that
cgroup. No real emails or production requests were sent. Docker Desktop was
started before measurement. No QA suites or builds ran concurrently with load.

## Results

| Metric (ms) | Run 1: 0.1 CPU | Run 2: 1 CPU | Run 3: 1 CPU | Run 4: 0.1 CPU | Required |
|---|---:|---:|---:|---:|---|
| About P95 | 404.06 | 33.33 | 21.13 | 405.37 | <100 |
| Projects P95 | 498.28 | 44.51 | 41.78 | 791.89 | <100 |
| Stack P95 | 401.15 | 38.86 | 23.11 | 498.37 | <100 |
| Health P99 | 1394.13 | 69.95 | 82.37 | 1827.06 | <100 |
| Contact acceptance P95 | 803.47 | 53.56 | 67.39 | 1294.35 | <200 |
| k6 exit | 99 | 0 | 0 | 99 | 0 |
| Checks passed | 334/334 | 334/334 | 334/334 | 334/334 | All |

Numeric P99 was retained through k6's summary statistics option. Each run completed
80 iterations and 334 requests with zero unexpected HTTP failures; the expected
metrics 401 was checked explicitly. Consumers completed ten console jobs each,
forty total. Final JSON health was always `ok`; pending, lag, DLQ, restarts, and
OOM were zero in all four runs.

| Load-window cgroup delta | Run 1 | Run 2 | Run 3 | Run 4 |
|---|---:|---:|---:|---:|
| CPU usage (seconds) | 1.494 | 1.103 | 1.079 | 1.858 |
| Throttled periods / periods | 135/205 | 2/91 | 4/92 | 174/235 |
| Throttled time (seconds) | 23.214 | 0.103 | 0.036 | 24.142 |

These are before/after deltas excluding application startup and settling time.
The window includes k6 container startup, setup/teardown, worker activity, and
boundary sampling overhead; it is not exclusive endpoint CPU time. Throttled time
is scheduler accounting across tasks, not HTTP latency or a wall-time percentage.
Memory peaks include startup/readiness probes: 114.54, 70.76, 70.37, and 71.21 MiB,
with no memory limit events.

## Bounded diagnosis

Changing only the CPU quota removes the failures twice; returning to 0.1 CPU
restores them. `cpu.max` changes from `10000 100000` to `100000 100000`: the low
budget allows only 10 ms of CPU per 100 ms period. Concurrent bursts can exhaust
that allowance even when average CPU across paced idle intervals is below 0.1 CPU.
The throttling deltas support this explanation. A low idle Docker CPU reading
would not refute it.

Application costs remain measurable at 1 CPU: read P95 is 21-45 ms, health P99 is
70-82 ms, and contact P95 is 54-67 ms. These include Uvicorn, middleware, logging,
serialization, Redis where applicable, and transport. They are not exclusive
function costs. Source inspection shows health deliberately rereads/parses JSON
in a worker thread while content reads cache JSON. This is a profiling candidate,
not evidence of a defect or justification to weaken health checks by caching.

No specific application defect was established, so no speculative optimization
or architecture change was made. This comparison does not explain every outlier,
establish the minimum viable quota, or exclude host/VM scheduling effects. There
are only 80 samples per read route and ten contact samples per run; tails are
particularly limited. This paced closed-loop workload achieves fewer requests
per second when responses slow down. It is not an equal fixed-arrival-rate test,
a production benchmark, or a 30-day SLO measurement.

Current 0.1-CPU acceptance remains failed. A capacity decision or a separately
measured application hotspot is needed before further changes. A passing 1-CPU
diagnostic does not approve upgrading the instance. Frontend retirement,
production environment verification, and external monitor checks remain open.

## Artifacts and reproduction

- [Run 1 summary](run-1.json), [environment](run-1-environment.json), [stdout](run-1-stdout.txt).
- [Run 2 summary](run-2.json), [environment](run-2-environment.json), [stdout](run-2-stdout.txt).
- [Run 3 summary](run-3.json), [environment](run-3-environment.json), [stdout](run-3-stdout.txt).
- [Run 4 summary](run-4.json), [environment](run-4-environment.json), [stdout](run-4-stdout.txt).

Stdout retains structured request/worker logs and Uvicorn access lines. Startup
stderr was observed but is not retained in stdout files. Per-run JSON retains
verified limits, CPU snapshots/deltas, memory events, health, queue state, and
exit status. Only diagnostic containers and their internal network were removed;
original images remain.

From the repository root with Docker and the original images available, run
`./benchmarks/scripts/cpu_comparison.ps1`. The runner rejects name collisions,
uses a fresh timestamped result directory, and removes only resources it creates.
Exit 99 is recorded and allowed so all four runs finish: inspect every threshold,
since runner exit 0 does not mean latency acceptance passed.

QA after measurement passed: 311 backend tests with 89.54% coverage, frontend
ESLint and TypeScript, and 101 Vitest tests across fourteen files. Initial sandbox
test attempts stalled and were stopped; the complete runs passed outside the
sandbox. PowerShell syntax parsing and evidence consistency checks also passed.
