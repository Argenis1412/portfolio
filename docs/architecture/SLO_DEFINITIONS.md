# Performance Targets and Measurement

These are targets encoded in checked-in k6 scripts, not verified production SLO
compliance. The retained [local experiment](../../benchmarks/results/f9eaa7f-local-20261017/README.md)
failed its latency thresholds. No current capacity or 30-day availability baseline
is established.

## Configured checks

| Script | Latency targets | Error/functional thresholds |
|---|---|---|
| [single_process_local.js](../../benchmarks/scripts/single_process_local.js) | About/projects/stack P95 <100 ms; health P99 <100 ms; contact acceptance P95 <200 ms. | All checks pass; no unexpected HTTP failures. |
| [health.js](../../benchmarks/scripts/health.js) | Steady-state P95 <50 ms and P99 <100 ms; overall HTTP duration P99 <200 ms. | Health error rate <1%. |
| [read_path.js](../../benchmarks/scripts/read_path.js) | Baseline about/projects/stack P95 <100 ms. | Read error rate <2%. |
| [contact.js](../../benchmarks/scripts/contact.js) | Normal-load acceptance P95 <200 ms. | Normal-load 5xx rate <5%. |

The latter scripts contain legacy/stress scenarios; inspect their populations
before interpreting combined values. A generated summary's pass label cannot
replace individual thresholds, exit codes, and raw evidence. The local console
scenario is incompatible with current production startup requirements; see the
[benchmark guide](../../benchmarks/README.md#current-validation-limits).

## Measurement contract

- Record commit, environment, CPU/memory, cold/warm state, concurrency, window,
  request counts, thresholds, and exit codes. Keep client/network time distinct
  from server-side latency.
- Contact timing measures acceptance/protection/enqueue, not asynchronous provider
  or inbox delivery. Worker outcomes, pending entries, and DLQ need separate checks.
- Prometheus latency quantiles are bucket estimates; sparse samples can distort
  them. Calculate error ratios over consistent routes/windows and inspect actual
  metric names/labels before querying.
- The instrumentator excludes probes/metrics and ignores untemplated routes.
  `/health` latency needs external timings. Inspect its JSON body as well as HTTP
  status, because degraded health still returns 200.
- The metrics summary is process-local. P95 uses a baseline reset after warmup;
  request/error counters are process-lifetime totals. It cannot establish rolling
  endpoint SLOs or aggregate replicas.

[Monitoring configuration](observability.md#local-monitoring) has separate alert
rules. Its thresholds are not the k6 targets above; deployed scraping, routing,
and availability monitoring remain unverified. Earlier alert proposals and
unmeasured availability objectives are omitted.
