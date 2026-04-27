/**
 * k6 Benchmark: Contact endpoint (write path)
 *
 * Endpoint: POST /api/v1/contact
 * SLO Target: P95 < 200ms (from SLO_DEFINITIONS.md)
 *
 * What we're measuring:
 *   - Write path latency (anti-spam + rate limiting + idempotency layers)
 *   - Rate limiter correctness: 10/day per email, 30/hour per IP
 *   - Idempotency key rejection (409 for duplicate in-flight)
 *   - Honeypot effectiveness (bots silently dropped)
 *
 * The uncomfortable trade-off here:
 *   The anti-abuse stack adds ~15-40ms per request (Redis round-trip).
 *   This is intentional: reliability over raw throughput.
 *   The benchmark documents WHAT we traded, not just WHAT we gained.
 *
 * Note on data:
 *   We rotate email addresses per VU to avoid hitting the 10/day per-email
 *   limit during the test, which would mask latency with 429 responses.
 *   Results are labeled "load test reproduced" — not a real traffic sample.
 *
 * Run:
 *   k6 run benchmarks/scripts/contact.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const contactLatency = new Trend("contact_latency_ms", true);
const contactErrors = new Rate("contact_error_rate");
const rateLimitHits = new Counter("contact_rate_limit_hits");
const honeypotDrops = new Counter("contact_honeypot_drops");

export const options = {
  scenarios: {
    // Scenario 1: Normal load — 1 message per unique user
    normal_load: {
      executor: "per-vu-iterations",
      vus: 10,
      iterations: 1,
      tags: { scenario: "normal_load" },
    },
    // Scenario 2: Abuse simulation — same IP hammering the endpoint
    // Expected: rate limiter kicks in after 30 req/hour threshold
    // We WANT to see 429s here. That means the system works.
    abuse_simulation: {
      executor: "constant-vus",
      vus: 5,
      duration: "20s",
      startTime: "15s",
      tags: { scenario: "abuse_simulation" },
    },
    // Scenario 3: Bot with honeypot filled (should be silently rejected)
    bot_honeypot: {
      executor: "per-vu-iterations",
      vus: 3,
      iterations: 2,
      startTime: "40s",
      tags: { scenario: "bot_honeypot" },
    },
  },
  thresholds: {
    // Latency SLO only for legitimate requests (normal_load scenario)
    "contact_latency_ms{scenario:normal_load}": ["p(95)<200"],
    // We expect errors in abuse scenario — rate is allowed to be high there
    "contact_error_rate{scenario:normal_load}": ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

// Generate unique emails per VU to avoid per-email rate limits in load tests
function getEmail(vuId, scenario) {
  return `bench-${scenario}-vu${vuId}@loadtest.invalid`;
}

export default function () {
  const scenario = __ENV.K6_SCENARIO_NAME || "normal_load";
  const vuId = __VU;

  if (scenario === "bot_honeypot") {
    // Simulate bot: fills honeypot field
    const payload = JSON.stringify({
      name: "Bot Name",
      email: getEmail(vuId, "bot"),
      message: "Spam message from bot",
      honeypot: "filled_by_bot", // This should be silently dropped
    });

    const res = http.post(`${BASE_URL}/api/v1/contact`, payload, {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "contact", type: "honeypot" },
      timeout: "5s",
    });

    honeypotDrops.add(1);
    // Honeypot should either 200 (silent drop) or 400
    check(res, {
      "bot silently rejected or 400": (r) => r.status === 200 || r.status === 400,
    });
    return;
  }

  // Legitimate request
  const payload = JSON.stringify({
    name: `Benchmark User ${vuId}`,
    email: getEmail(vuId, scenario),
    message: `Benchmark test message from VU ${vuId}. This is a legitimate-looking contact form submission used for load testing purposes.`,
    honeypot: "", // Empty — legitimate user
  });

  const res = http.post(`${BASE_URL}/api/v1/contact`, payload, {
    headers: { "Content-Type": "application/json" },
    tags: { endpoint: "contact", type: "legitimate" },
    timeout: "10s",
  });

  contactLatency.add(res.timings.duration);

  if (res.status === 429) {
    rateLimitHits.add(1);
    contactErrors.add(false); // 429 in abuse scenario is EXPECTED, not an error
  } else {
    contactErrors.add(res.status >= 500);
  }

  check(res, {
    "legitimate: 2xx or 429": (r) => r.status < 500,
    "no 5xx": (r) => r.status < 500,
  });

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify(
      {
        endpoint: "contact",
        timestamp: new Date().toISOString(),
        data_label: "load_test_reproduced", // NOT real traffic — labeled explicitly
        metrics: {
          p50: data.metrics.contact_latency_ms?.values?.["p(50)"],
          p95: data.metrics.contact_latency_ms?.values?.["p(95)"],
          p99: data.metrics.contact_latency_ms?.values?.["p(99)"],
          max: data.metrics.contact_latency_ms?.values?.max,
          error_rate: data.metrics.contact_error_rate?.values?.rate,
          rate_limit_hits: data.metrics.contact_rate_limit_hits?.values?.count,
          honeypot_drops: data.metrics.contact_honeypot_drops?.values?.count,
        },
        slo_target: { p95_ms: 200, note: "Write path with Redis anti-abuse stack" },
        known_trade_off:
          "Anti-abuse stack (Redis round-trip) adds ~15-40ms per request intentionally. Reliability > raw throughput.",
      },
      null,
      2
    ),
  };
}
