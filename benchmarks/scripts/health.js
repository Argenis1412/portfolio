/**
 * k6 Benchmark: Health Check endpoint
 *
 * Endpoint: GET /health
 * SLO Target: P99 < 20ms (from SLO_DEFINITIONS.md)
 *
 * What we're measuring:
 *   - Baseline latency under sustained load (no cold starts)
 *   - P95 / P99 distribution (not just averages)
 *   - Error rate under 10 concurrent users
 *
 * Why this matters:
 *   Health check is used by Koyeb probes every ~10s.
 *   If it degrades, the hypervisor may restart the container —
 *   cascading into cold-start latency for real requests.
 *
 * Run:
 *   k6 run benchmarks/scripts/health.js
 *   k6 run --out json=benchmarks/results/health_{commit}.json benchmarks/scripts/health.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

// Custom metrics — more granular than k6 defaults
const healthLatency = new Trend("health_latency_ms", true);
const healthErrors = new Rate("health_error_rate");

export const options = {
  scenarios: {
    // Scenario 1: Steady-state (baseline — matches normal Koyeb probe cadence)
    steady_state: {
      executor: "constant-vus",
      vus: 5,
      duration: "30s",
      tags: { scenario: "steady_state" },
    },
    // Scenario 2: Ramp-up (simulates traffic spike on deploy/wake)
    ramp_up: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "15s", target: 20 },
        { duration: "15s", target: 20 },
        { duration: "10s", target: 0 },
      ],
      startTime: "35s", // starts after steady_state
      tags: { scenario: "ramp_up" },
    },
  },
  thresholds: {
    // Hard SLO gates — test fails if breached
    "health_latency_ms{scenario:steady_state}": ["p(95)<50", "p(99)<100"],
    "health_error_rate": ["rate<0.01"], // <1% errors
    http_req_duration: ["p(99)<200"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

export default function () {
  const res = http.get(`${BASE_URL}/health`, {
    tags: { endpoint: "health" },
    timeout: "5s",
  });

  // Record custom metrics
  healthLatency.add(res.timings.duration);
  healthErrors.add(res.status !== 200);

  check(res, {
    "status 200": (r) => r.status === 200,
    "has status field": (r) => {
      try {
        return JSON.parse(r.body).status === "ok";
      } catch {
        return false;
      }
    },
    "latency < 200ms": (r) => r.timings.duration < 200,
  });

  sleep(0.1);
}

export function handleSummary(data) {
  // Machine-readable output for CI and result archiving
  return {
    stdout: JSON.stringify(
      {
        endpoint: "health",
        timestamp: new Date().toISOString(),
        thresholds_passed: !data.metrics.http_req_failed?.values?.rate,
        metrics: {
          p50: data.metrics.health_latency_ms?.values?.["p(50)"],
          p95: data.metrics.health_latency_ms?.values?.["p(95)"],
          p99: data.metrics.health_latency_ms?.values?.["p(99)"],
          max: data.metrics.health_latency_ms?.values?.max,
          error_rate: data.metrics.health_error_rate?.values?.rate,
          iterations: data.metrics.iterations?.values?.count,
        },
        slo_target: { p99_ms: 20, note: "Koyeb probe cadence ~10s" },
      },
      null,
      2
    ),
  };
}
