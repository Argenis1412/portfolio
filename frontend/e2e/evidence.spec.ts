import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
const current = JSON.parse(readFileSync(new URL('../src/tests/fixtures/metrics-d0d1cea.json', import.meta.url), 'utf8'));
const previous = JSON.parse(readFileSync(new URL('../src/tests/fixtures/metrics-9705b4a.json', import.meta.url), 'utf8'));

for (const [name, metrics] of Object.entries({ current, previous })) {
  test(`renders the ${name} backend contract without legacy states`, async ({ page }) => {
    await page.route('**/api/v1/metrics/summary', route => route.fulfill({ json: metrics }));
    await page.goto('/production-evidence');
    await expect(page.locator('#metrics').getByText('44ms', { exact: true })).toBeVisible();
    await expect(page.getByText('NORMAL', { exact: true })).toHaveCount(0);
    await expect(page.locator('#observability')).toHaveCount(0);
    await expect(page.locator('#logs')).toContainText('Browser events');
  });
}

test('distinguishes warming-up readings from zero latency measurements', async ({ page }) => {
  await page.route('**/api/v1/metrics/summary', route => route.fulfill({ json: { ...current, p95_ms: 0, p95_status: 'warming_up', error_rate_status: 'warming_up' } }));
  await page.goto('/production-evidence');
  await expect(page.locator('#metrics').getByText('calibrating', { exact: true }).first()).toBeVisible();
  await expect(page.locator('#metrics').getByText('0ms', { exact: true })).toHaveCount(0);
  await expect(page.locator('#metrics svg')).toHaveCount(0);
});

test('shows measured degradation and local threshold alerts', async ({ page }) => {
  await page.route('**/api/v1/metrics/summary', route => route.fulfill({ json: { ...current, p95_ms: 180, p95_status: 'degraded', system_status: 'degraded' } }));
  await page.goto('/production-evidence');
  await expect(page.locator('#metrics').getByText('180ms', { exact: true })).toBeVisible();
  await expect(page.locator('#logs')).toContainText('latency_threshold_breached');
  await expect(page.locator('#logs')).not.toContainText('db=CONNECTED');
});

test('expires previous readings at 60 seconds and recovers on a valid poll', async ({ page }) => {
  await page.clock.install();
  let valid = true;
  await page.route('**/api/v1/metrics/summary', route => route.fulfill({ json: valid ? current : { ...current, system_status: 'unknown' } }));
  await page.goto('/production-evidence');
  await expect(page.locator('#metrics').getByText('44ms', { exact: true })).toBeVisible();
  const received = await page.locator('#metrics time').getAttribute('datetime');
  valid = false;
  await page.clock.runFor(59_000);
  await expect(page.locator('#metrics')).toContainText('Previous data');
  await expect(page.locator('#metrics').getByText('44ms', { exact: true })).toBeVisible();
  await page.clock.runFor(2_000);
  await expect(page.locator('#metrics')).toContainText('No current data');
  await expect(page.locator('#metrics').getByText('44ms', { exact: true })).toHaveCount(0);
  await expect(page.locator('#metrics time')).toHaveAttribute('datetime', received!);
  valid = true;
  await page.clock.runFor(16_000);
  await expect(page.locator('#metrics').getByText('44ms', { exact: true })).toBeVisible();
});

test('rejects an invalid initial contract without reporting backend downtime', async ({ page }) => {
  await page.clock.install();
  let requests = 0;
  await page.route('**/api/v1/metrics/summary', route => {
    requests += 1;
    return route.fulfill({ json: { ...current, p95_status: 'unknown' } });
  });
  await page.goto('/production-evidence');
  await expect(page.locator('#metrics')).toBeVisible();
  for (let retry = 0; retry < 3; retry += 1) {
    await expect.poll(() => requests).toBeGreaterThanOrEqual(retry + 1);
    await page.clock.runFor(2 ** retry * 1_000 + 100);
  }
  await expect.poll(() => requests).toBeGreaterThanOrEqual(4);
  await expect(page.locator('#metrics')).toContainText('No current data');
  await expect(page.locator('#metrics')).toContainText('No valid reading yet');
  await expect(page.locator('#metrics').getByText('DOWN', { exact: true })).toHaveCount(0);
});

test('refreshes an expired reading on visibility return before the next poll', async ({ page }) => {
  await page.clock.install();
  let resume: (() => Promise<void>) | undefined;
  let requests = 0;
  let returning = false;
  await page.route('**/api/v1/metrics/summary', route => {
    requests += 1;
    if (!returning) return route.fulfill({ json: current });
    resume = () => route.fulfill({ json: { ...current, p95_ms: 45 } });
  });
  await page.goto('/production-evidence');
  await expect(page.locator('#metrics').getByText('44ms', { exact: true })).toBeVisible();
  const initialRequests = requests;
  returning = true;
  const now = await page.evaluate(() => Date.now());
  // Move wall time without running polling timers, as with a suspended tab.
  await page.clock.setSystemTime(now + 120_000);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange', { bubbles: true })));
  await expect(page.locator('#metrics')).toContainText('No current data');
  await expect(page.locator('#metrics').getByText('44ms', { exact: true })).toHaveCount(0);
  await expect.poll(() => requests).toBe(initialRequests + 1);
  await resume!();
  await expect(page.locator('#metrics').getByText('45ms', { exact: true })).toBeVisible();
});

test('blocks external telemetry, unexpected mutations and external websockets', async ({ page, network }) => {
  await page.goto('/');
  const blocked = await page.evaluate(async () => {
    const outcomes = await Promise.all([
      fetch('https://telemetry.example.invalid/envelope', { method: 'POST', body: 'isolated' }).then(() => false, () => true),
      fetch('https://another-api.example.invalid/api/v1/unexpected', { method: 'POST' }).then(() => false, () => true),
    ]);
    const websocketClosed = await new Promise<boolean>(resolve => {
      const socket = new WebSocket('wss://telemetry.example.invalid/socket');
      socket.onclose = () => resolve(true);
      socket.onerror = () => resolve(true);
    });
    return { outcomes, websocketClosed };
  });
  expect(blocked).toEqual({ outcomes: [true, true], websocketClosed: true });
  expect(network.blocked).toContain('https://telemetry.example.invalid/envelope');
  expect(network.unexpected.splice(0)).toEqual(['POST https://another-api.example.invalid/api/v1/unexpected']);
});

for (const status of [429, 500]) {
  test(`keeps contact ${status} responses isolated and visible`, async ({ page, network }) => {
    await page.route('**/api/v1/contact', route => route.fulfill({ status, json: { error: { message: 'Isolated failure', trace_id: 'test-error' } } }));
    await page.goto('/#contact');
    await page.locator('#name').fill('Portfolio test');
    await page.locator('#email').fill('test@example.invalid');
    await page.locator('#message').fill('This message must never leave the browser test.');
    await page.locator('#contact button[type=submit]').click();
    await expect(page.locator('#contact')).toContainText(String(status));
    expect(network.contact).toEqual([]);
  });
}

test('keeps required-field validation in the browser', async ({ page, network }) => {
  await page.goto('/#contact');
  await page.locator('#contact button[type=submit]').click();
  expect(network.contact).toEqual([]);
  await expect(page.locator('#email')).toHaveValue('');
});

for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } })) {
  for (const theme of ['light', 'dark']) {
    test(`reviews ${name} ${theme} metrics with reduced motion`, async ({ page }, testInfo) => {
      await page.addInitScript(value => localStorage.setItem('portfolio_theme', value), theme);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/production-evidence');
      await expect(page.locator('#metrics').getByText('44ms', { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Production evidence', exact: true })).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.locator('#metrics').scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`${name}-${theme}-metrics.png`) });
    });
  }
}
