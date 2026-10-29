import { test, expect } from './fixtures';

for (const theme of ['light', 'dark']) {
  test(`keeps the timeline readable while the mouse is held in ${theme} mode`, async ({ page }, testInfo) => {
    await page.addInitScript(value => {
      localStorage.setItem('portfolio_theme', value);
      // Content must remain readable even when viewport notifications are delayed.
      IntersectionObserver.prototype.observe = () => {};
    }, theme);
    await page.goto('/');
    const disclosure = page.locator('#about details').filter({ hasText: 'Experience and education' });
    await disclosure.locator('summary').click();
    const entries = disclosure.locator('article');
    await expect(entries).toHaveCount(2);

    await page.mouse.move(10, 300);
    await page.mouse.down();
    try {
      await page.mouse.wheel(0, 450);
      for (const entry of await entries.all()) {
        // Playwright's toBeVisible deliberately ignores opacity on ancestors.
        const opacities = await entry.evaluate(element => {
          const values: string[] = [];
          for (let current: Element | null = element; current; current = current.parentElement) {
            values.push(getComputedStyle(current).opacity);
          }
          return values;
        });
        expect(opacities.every(value => value === '1')).toBe(true);
      }
    } finally {
      await page.mouse.up();
    }

    await entries.first().scrollIntoViewIfNeeded();
    await expect(entries.first()).toContainText('UFPR');
    await expect(entries.last()).toContainText('Ademicon');
    await page.screenshot({ path: testInfo.outputPath(`timeline-${theme}.png`) });
  });
}

for (const width of [320, 768, 1440]) {
  test(`shows a circular portrait and understandable language choices at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(theme => localStorage.setItem('portfolio_theme', theme), width === 768 ? 'dark' : 'light');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const language = page.getByRole('combobox');
    await expect(language).toHaveAccessibleName('Language');
    await expect(language.getByRole('option')).toHaveText(['Português', 'English', 'Español']);
    await language.focus();
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(language).toHaveAccessibleName('Idioma');
    await expect(page.locator('#hero h1')).toHaveText('APIs y sistemas backend.');
    await page.reload();
    await expect(language).toHaveValue('es');

    const portrait = page.getByRole('img', { name: 'Argenis Lopez', exact: true });
    await expect(portrait).toHaveAttribute('loading', 'lazy');
    await expect(page.locator('link[rel="preload"][as="image"][href="/profile.webp"]')).toHaveCount(0);
    await portrait.scrollIntoViewIfNeeded();
    const geometry = await portrait.evaluate(element => {
      const { width, height } = element.getBoundingClientRect();
      return { width, height, radius: getComputedStyle(element).borderRadius };
    });
    expect(geometry.width).toBeGreaterThanOrEqual(144);
    expect(geometry.height).toBe(geometry.width);
    expect(parseFloat(geometry.radius)).toBeGreaterThanOrEqual(geometry.width / 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`about-${width}.png`) });

    await page.locator('#about summary', { hasText: 'Experiencia y formación' }).click();
    await page.locator('#experience article').first().scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`timeline-${width}.png`) });
  });
}
