/**
 * k6 Benchmark: JSON-First Read Path
 *
 * Endpoints: GET /api/v1/about, /api/v1/projects, /api/v1/stack
 * SLO Target: P95 < 50ms (from SLO_DEFINITIONS.md)
 *
 * What we're measuring:
 *   - Read path latency under concurrent load (no DB cold-starts, JSON-first)
 *   - Comparison between endpoints that hit JSON vs those with any DB fallback
 *   - Whether ETag / 304 caching is functioning (conditional GETs)
 *
 * The uncomfortable trade-off this exposes (INC-002 context):
 *   Before JSON-first (v1.4.1): cold-start latency was 280-400ms.
 *   The JSON layer fixes latency BUT adds memory overhead per worker.
 *   Under very high VU count, GC pressure may spike — we'll see it here.
 *
 * Run:
 *   k6 run benchmarks/scripts/read_path.js
 *   k6 run --out json=benchmarks/results/read_path_{commit}.json benchmarks/scripts/read_path.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const aboutLatency = new Trend("about_latency_ms", true);
const projectsLatency = new Trend("projects_latency_ms", true);
const stackLatency = new Trend("stack_latency_ms", true);
const readPathErrors = new Rate("read_path_error_rate");

export const options = {
  scenarios: {
    // Scenario 1: Baseline — matches realistic portfolio traffic
    baseline: {
      executor: "constant-vus",
      vus: 10,
      duration: "30s",
      tags: { scenario: "baseline" },
    },
    // Scenario 2: Stress — push until something shows stress
    // This is the "uncomfortable benchmark": we're NOT trying to pass,
    // we're trying to find where the system starts to degrade.
    stress: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { duration: "20s", target: 50 },
        { duration: "20s", target: 100 },
        { duration: "10s", target: 0 },
      ],
      startTime: "35s",
      tags: { scenario: "stress" },
    },
  },
  thresholds: {
    // SLO gates for the baseline scenario
    "about_latency_ms{scenario:baseline}": ["p(95)<50"],
    "projects_latency_ms{scenario:baseline}": ["p(95)<50"],
    "stack_latency_ms{scenario:baseline}": ["p(95)<50"],
    // Error rate across all scenarios
    read_path_error_rate: ["rate<0.02"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

// Simulate ETag-based conditional GET (like a browser would after first load)
let cachedEtags = {};

export default function () {
  group("read_path", () => {
    // /about
    group("about", () => {
      const headers = {};
      if (cachedEtags["about"]) {
        headers["If-None-Match"] = cachedEtags["about"];
      }
      const res = http.get(`${BASE_URL}/api/v1/about`, {
        headers,
        tags: { endpoint: "about" },
        timeout: "5s",
      });
      aboutLatency.add(res.timings.duration);
      readPathErrors.add(res.status >= 500);

      if (res.headers["Etag"]) {
        cachedEtags["about"] = res.headers["Etag"];
      }

      check(res, {
        "about: 200 or 304": (r) => r.status === 200 || r.status === 304,
        "about: latency < 100ms": (r) => r.timings.duration < 100,
      });
    });

    sleep(0.05);

    // /projects
    group("projects", () => {
      const headers = {};
      if (cachedEtags["projects"]) {
        headers["If-None-Match"] = cachedEtags["projects"];
      }
      const res = http.get(`${BASE_URL}/api/v1/projects`, {
        headers,
        tags: { endpoint: "projects" },
        timeout: "5s",
      });
      projectsLatency.add(res.timings.duration);
      readPathErrors.add(res.status >= 500);

      if (res.headers["Etag"]) {
        cachedEtags["projects"] = res.headers["Etag"];
      }

      check(res, {
        "projects: 200 or 304": (r) => r.status === 200 || r.status === 304,
        "projects: latency < 100ms": (r) => r.timings.duration < 100,
      });
    });

    sleep(0.05);

    // /stack
    group("stack", () => {
      const headers = {};
      if (cachedEtags["stack"]) {
        headers["If-None-Match"] = cachedEtags["stack"];
      }
      const res = http.get(`${BASE_URL}/api/v1/stack`, {
        headers,
        tags: { endpoint: "stack" },
        timeout: "5s",
      });
      stackLatency.add(res.timings.duration);
      readPathErrors.add(res.status >= 500);

      if (res.headers["Etag"]) {
        cachedEtags["stack"] = res.headers["Etag"];
      }

      check(res, {
        "stack: 200 or 304": (r) => r.status === 200 || r.status === 304,
        "stack: latency < 100ms": (r) => r.timings.duration < 100,
      });
    });
  });

  sleep(0.1);
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify(
      {
        endpoint_group: "read_path",
        timestamp: new Date().toISOString(),
        endpoints: {
          about: {
            p50: data.metrics.about_latency_ms?.values?.["p(50)"],
            p95: data.metrics.about_latency_ms?.values?.["p(95)"],
            p99: data.metrics.about_latency_ms?.values?.["p(99)"],
            max: data.metrics.about_latency_ms?.values?.max,
          },
          projects: {
            p50: data.metrics.projects_latency_ms?.values?.["p(50)"],
            p95: data.metrics.projects_latency_ms?.values?.["p(95)"],
            p99: data.metrics.projects_latency_ms?.values?.["p(99)"],
            max: data.metrics.projects_latency_ms?.values?.max,
          },
          stack: {
            p50: data.metrics.stack_latency_ms?.values?.["p(50)"],
            p95: data.metrics.stack_latency_ms?.values?.["p(95)"],
            p99: data.metrics.stack_latency_ms?.values?.["p(99)"],
            max: data.metrics.stack_latency_ms?.values?.max,
          },
        },
        error_rate: data.metrics.read_path_error_rate?.values?.rate,
        slo_target: { p95_ms: 50, note: "JSON-first read path (post INC-002 fix)" },
        note: "Stress scenario intentionally pushes beyond SLO to find degradation point",
      },
      null,
      2
    ),
  };
}
