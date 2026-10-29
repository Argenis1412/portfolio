import { expect, test } from './fixtures';

test.describe('public routes', () => {
  for (const [path, heading, count] of [
    ['/', 'APIs and backend systems.', 1],
    ['/projects/loja-app', 'Loja App', 1],
    ['/production-evidence', 'Full-Stack Portfolio', 1],
    ['/decisions/json-first', 'JSON-first reads', 0],
    ['/does-not-exist', 'Page not found', 0],
    ['/projects/loja-app/unknown', 'Page not found', 0],
  ] as const) {
    test(`requests projects only when consumed on ${path}`, async ({ page }) => {
      const requests: string[] = [];
      page.on('request', request => {
        if (new URL(request.url()).pathname === '/api/v1/projects') requests.push(request.url());
      });
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeFocused();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      if (path === '/') await expect(page.locator('#projects article')).toHaveCount(4);
      expect(requests).toHaveLength(count);
    });
  }

  test('loads project and decision deep links and redirects the retired evidence route', async ({ page }) => {
    await page.goto('/projects/rate-limiter');
    await expect(page.getByRole('heading', { name: 'Project case study' })).toBeVisible();

    await page.goto('/decisions/json-first');
    await expect(page.getByRole('heading', { name: 'JSON-first reads' })).toBeVisible();

    await page.goto('/production-evidence');
    await expect(page).toHaveURL(/\/projects\/portfolio-api$/);
    await expect(page.getByRole('heading', { name: 'Full-Stack Portfolio', exact: true })).toBeFocused();
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
