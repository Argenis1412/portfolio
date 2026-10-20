/** Local API/consumer validation. No external API targets or email provider. */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import encoding from 'k6/encoding';

const base = __ENV.BASE_URL || 'http://127.0.0.1:18080';
if (!/^http:\/\/(127\.0\.0\.1|localhost):18080$/.test(base)) {
  throw new Error('This validation only accepts the isolated local port 18080');
}
const run = Number(__ENV.RUN_ID || '1');
if (!Number.isInteger(run) || run < 1 || run > 254) {
  throw new Error('RUN_ID must be an integer from 1 through 254');
}
const about = new Trend('about_ms', true);
const projects = new Trend('projects_ms', true);
const stack = new Trend('stack_ms', true);
const health = new Trend('health_ms', true);
const contact = new Trend('contact_acceptance_ms', true);

export const options = {
  maxRedirects: 0,
  scenarios: {
    clients: { executor: 'per-vu-iterations', vus: 10, iterations: 8, maxDuration: '2m' },
  },
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate==0'],
    about_ms: ['p(95)<100'],
    projects_ms: ['p(95)<100'],
    stack_ms: ['p(95)<100'],
    health_ms: ['p(99)<100'],
    contact_acceptance_ms: ['p(95)<200'],
  },
};

function workerSuccesses(response) {
  if (response.status !== 200) return -1;
  const line = response.body.split('\n').find(value =>
    value.startsWith('worker_jobs_processed_total{') &&
    value.includes('status="success"') && value.includes('reason="ok"'));
  return line ? Number(line.split(' ').pop()) : 0;
}

function metrics() {
  return http.get(`${base}/metrics`, {
    headers: { Authorization: `Basic ${encoding.b64encode('validation:local-only')}` },
    timeout: '5s',
  });
}

export function setup() {
  const healthResponse = http.get(`${base}/health`);
  const denied = http.get(`${base}/metrics`, { responseCallback: http.expectedStatuses(401) });
  check(healthResponse, { 'initial JSON health is ok': r => r.status === 200 && r.json('status') === 'ok' });
  check(denied, { 'production metrics require authentication': r => r.status === 401 });
  const initial = metrics();
  check(initial, { 'local scrape credentials work': r => r.status === 200 });
  return { processed: workerSuccesses(initial) };
}

export default function () {
  // Emulate ten distinct clients through the isolated test proxy configuration.
  // Eight iterations keep the shared read-limit key below 20/minute per client.
  const headers = { 'X-Forwarded-For': `198.18.${run}.${__VU}` };
  for (const [path, metric] of [
    ['/api/v1/about', about], ['/api/v1/projects', projects],
    ['/api/v1/stack', stack], ['/health', health],
  ]) {
    const response = http.get(`${base}${path}`, { headers, timeout: '10s' });
    metric.add(response.timings.duration);
    check(response, { [`${path} returns usable content`]: r => r.status === 200 && (path !== '/health' || r.json('status') === 'ok') });
  }
  if (__ITER === 0) {
    const response = http.post(`${base}/api/v1/contact`, JSON.stringify({
      name: 'Local Benchmark', email: `local-run${run}-vu${__VU}@example.com`,
      subject: 'Isolated console delivery',
      message: `Local validation run ${run}, client ${__VU}. No external email provider is configured.`,
    }), { headers: { ...headers, 'Content-Type': 'application/json' }, timeout: '10s' });
    contact.add(response.timings.duration);
    check(response, { 'contact accepted onto stream': r => r.status === 200 && r.json('success') === true && r.json('delivery_mode') === 'stream' });
  }
  sleep(2);
}

export function teardown(initial) {
  let processed = -1;
  for (let attempt = 0; attempt < 15; attempt++) {
    processed = workerSuccesses(metrics());
    if (processed - initial.processed >= 10) break;
    sleep(1);
  }
  check(processed, { 'consumer completed all ten console jobs': count => initial.processed >= 0 && count - initial.processed === 10 });
}

export function handleSummary(data) {
  const output = __ENV.SUMMARY_PATH;
  if (!output) throw new Error('SUMMARY_PATH is required to retain validation evidence');
  return { [output]: JSON.stringify(data, null, 2), stdout: `Local run ${run} complete; inspect thresholds in ${output}\n` };
}
