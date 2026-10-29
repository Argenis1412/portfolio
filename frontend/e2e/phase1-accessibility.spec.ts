import { test, expect } from './fixtures';

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  for (const [language, experienceLabel, journeyLabel] of [
    ['en', 'Experience and education', 'Journey'],
    ['pt', 'Experiência e formação', 'Trajetória'],
    ['es', 'Experiencia y formación', 'Trayectoria'],
  ]) {
    test(`preserves native disclosure and keyboard navigation in ${language} with motion ${reducedMotion}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 900 });
      await page.emulateMedia({ reducedMotion });
      const errors: string[] = [];
      const requests: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => requests.push(request.url()));
      await page.goto('/');
      await page.getByRole('combobox').selectOption(language);
      await expect(page.locator('#projects article')).toHaveCount(4);
      const experienceRequests = () => requests.filter(url => /\/api\/v1\/(experiences|formation)$/.test(url));
      const summary = page.locator('#about summary', { hasText: experienceLabel });
      await summary.focus();
      await summary.hover();
      expect(experienceRequests()).toHaveLength(0);
      await expect(page.locator('#experience')).toHaveCount(0);
      await page.keyboard.press('Enter');
      await expect(page.locator('#experience').getByRole('heading', { name: journeyLabel, exact: true })).toBeVisible();
      expect(experienceRequests()).toHaveLength(2);
      await summary.focus();
      await page.keyboard.press('Space');
      await expect(page.locator('#experience')).toBeHidden();
      await page.keyboard.press('Enter');
      await expect(page.locator('#experience')).toBeVisible();
      expect(experienceRequests()).toHaveLength(2);
      await page.getByRole('button', { name: 'Toggle Theme', exact: true }).click();
      const theme = await page.evaluate(() => localStorage.getItem('portfolio_theme'));
      await expect(page.locator('html')).toHaveClass(new RegExp(theme!));
      const trigger = page.getByRole('button', { name: 'Open Menu', exact: true });
      await trigger.click();
      await expect(page.getByRole('button', { name: 'Close Menu', exact: true })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(page.getByTestId('mobile-nav-contact')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Close Menu', exact: true })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'Main navigation' })).toBeHidden();
      await expect(trigger).toBeFocused();
      await page.locator('#projects a[href="/projects/loja-app"]').click();
      await expect(page.getByRole('heading', { name: 'Loja App', exact: true })).toBeFocused();
      await page.goto('/phase1-missing-route');
      await expect(page.locator('main h1')).toBeFocused();
      await expect(page.locator('main a[href="/"]')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}
