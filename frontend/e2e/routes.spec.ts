import { expect, test } from '@playwright/test';

test.describe('public routes', () => {
  test('loads project, decision, and production evidence deep links', async ({ page }) => {
    await page.goto('/projects/rate-limiter');
    await expect(page.getByRole('heading', { name: 'Project case study' })).toBeVisible();

    await page.goto('/decisions/json-first');
    await expect(page.getByRole('heading', { name: 'Engineering decision' })).toBeVisible();

    await page.goto('/production-evidence');
    await expect(page.getByRole('heading', { name: 'Production evidence' })).toBeVisible();
  });

  test('shows an accessible 404 page for an unknown deep link', async ({ page }) => {
    await page.goto('/does-not-exist');

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeFocused();
    await expect(page.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });
});
