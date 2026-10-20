import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration.
 *
 * Tests run against the production URL when BASE_URL is set,
 * or against a local dev server otherwise.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: process.env.PLAYWRIGHT_HTML_OUTPUT_DIR || (process.env.CI ? 'playwright-report' : join(tmpdir(), 'portfolio-playwright-report')) }]],

  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || join(tmpdir(), 'portfolio-playwright-results'),

  use: {
    // Use BASE_URL from environment (CI/production) or fallback to local dev server
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    serviceWorkers: 'block',
  },

  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    env: {
      VITE_API_URL: 'http://api.portfolio.test/api/v1',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
