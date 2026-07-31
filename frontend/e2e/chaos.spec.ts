import { test, expect } from '@playwright/test';

/**
 * Chaos Playground E2E Smoke Tests
 *
 * Verifies that each chaos action button (Drain, Retry, Latency) fires a
 * POST request that receives an isolated, contract-compatible 2xx response.
 *
 * Strategy: intercept mutating requests in the browser so release validation
 * cannot alter production chaos state, metrics, queues, or incidents.
 */

const CHAOS_ENDPOINTS = [
  { name: 'drain',   path: '/api/v1/chaos/drain' },
  { name: 'retry',   path: '/api/v1/chaos/retry' },
  { name: 'latency', path: '/api/v1/chaos/latency' },
] as const;

const CHAOS_FIXTURES = {
  drain: { status: 'completed', incident_type: 'queue_drain', tasks_purged: 0, elapsed_ms: 50 },
  retry: { status: 'completed', incident_type: 'manual_retry' },
  latency: { status: 'completed', incident_type: 'latency_injection', latency_ms: 3000 },
} as const;

test.describe('Chaos Playground — smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/\/api\/v1\/chaos\/(drain|retry|latency)$/, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }

      const action = route.request().url().match(/\/chaos\/(drain|retry|latency)$/)?.[1] as keyof typeof CHAOS_FIXTURES;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(CHAOS_FIXTURES[action]),
      });
    });

    await page.route(/\/api\/v1\/chaos\/(drain|retry|latency)$/, async (route) => {
      if (route.request().method() !== 'OPTIONS') {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '600',
        },
      });
    });

    await page.goto('/production-evidence');
    await page.waitForLoadState('networkidle');
  });

  for (const { name, path } of CHAOS_ENDPOINTS) {
    test(`chaos.${name} button sends POST and receives 2xx`, async ({ page }) => {
      // Locate the button by its data-testid attribute
      const button = page.locator(`[data-testid="chaos-btn-${name}"]`);

      // Wait for the button to be visible (Chaos Playground section must be enabled)
      await expect(button).toBeVisible({ timeout: 10_000 });

      // Observe the intercepted response before clicking.
      const [response] = await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes(path) && res.request().method() === 'POST',
          { timeout: 15_000 },
        ),
        button.click(),
      ]);

      // Assert the backend returned a successful status
      expect(response.status(), `Expected 2xx for ${path}`).toBeLessThan(300);
      await expect(page.locator('#chaos').getByText('synthetic', { exact: true })).toBeVisible();
    });
  }
});
