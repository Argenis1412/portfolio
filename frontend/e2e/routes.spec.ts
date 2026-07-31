import { expect, test } from '@playwright/test';

test.describe('public routes', () => {
  test('loads project, decision, and production evidence deep links', async ({ page }) => {
    await page.goto('/projects/rate-limiter');
    await expect(page.getByRole('heading', { name: 'Project case study' })).toBeVisible();

    await page.goto('/decisions/json-first');
    await expect(page.getByRole('heading', { name: 'JSON-first reads' })).toBeVisible();

    await page.goto('/production-evidence');
    await expect(page.getByRole('heading', { name: 'Production evidence' })).toBeVisible();
  });

  test('shows an accessible 404 page for an unknown deep link', async ({ page }) => {
    await page.goto('/does-not-exist');

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeFocused();
    await expect(page.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });

  test('routes section navigation through the home page', async ({ page }) => {
    await page.goto('/projects/rate-limiter');
    await page.getByTestId('nav-contact').click();

    await expect(page).toHaveURL(/\/#contact$/);
    await expect(page.locator('#contact')).toBeVisible();
  });

  test('keeps evidence sections in place when mild chaos is activated', async ({ page }) => {
    await page.goto('/production-evidence');

    const metricsHeading = page.locator('#metrics h2');
    const metricsTopBefore = await metricsHeading.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);

    await page.getByRole('button', { name: 'MILD', exact: true }).click();
    await expect(page.getByText('Live chaos simulation active')).toBeVisible();

    const metricsTopAfter = await metricsHeading.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    expect(metricsTopAfter).toBe(metricsTopBefore);
  });
});

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  test('traps keyboard focus and restores it after dismissal', async ({ page }) => {
    await page.goto('/');

    const menuTrigger = page.getByRole('button', { name: 'Open Menu' });
    await expect(menuTrigger).toBeVisible();
    await menuTrigger.click();

    const dialog = page.getByRole('dialog', { name: 'Main navigation' });
    const closeButton = dialog.getByRole('button', { name: 'Close Menu' });
    const contactButton = dialog.getByTestId('mobile-nav-contact');

    await expect(dialog).toBeVisible();
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(contactButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(menuTrigger).toBeFocused();
  });
});
