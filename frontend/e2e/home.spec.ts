import { test, expect } from './fixtures';

for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, tablet: { width: 1024, height: 900 }, mobile: { width: 390, height: 844 } })) {
  for (const theme of ['dark', 'light']) {
    test(`keeps projects prominent on ${name} in ${theme} theme`, async ({ page }, testInfo) => {
      await page.addInitScript(value => localStorage.setItem('portfolio_theme', value), theme);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      const hero = page.locator('#hero');
      await expect(hero.getByRole('heading', { level: 1 })).toHaveText('APIs and backend systems.');
      await expect(hero.getByRole('heading', { level: 1 })).toBeFocused();
      const headingStyle = await hero.locator('h1').evaluate(element => {
        const style = getComputedStyle(element);
        return { font: style.fontFamily, size: parseFloat(style.fontSize), spacing: parseFloat(style.letterSpacing) };
      });
      expect(headingStyle.font).toContain('Inter');
      expect(headingStyle.size).toBe(viewport.width >= 1200 ? 52 : viewport.width >= 768 ? 44 : 34);
      expect(headingStyle.spacing).toBeLessThan(0);
      await expect(hero.getByRole('button')).toHaveCount(1);
      await expect(hero.getByRole('link', { name: 'Explore the system' })).toHaveAttribute('href', '/production-evidence');
      const projects = page.locator('#projects');
      await expect(projects.locator('article')).toHaveCount(4);
      await expect(projects.getByRole('heading', { level: 3 })).toHaveText(['Full-Stack Portfolio', 'Housing Finance GPS', 'Loja App', 'PatchForge']);
      await expect(projects.getByRole('heading', { name: 'Loja App' })).toBeVisible();
      const title = await projects.getByRole('heading', { name: 'Projects', exact: true }).boundingBox();
      expect(title!.y + title!.height).toBeLessThan(viewport.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('#metrics, #logs')).toHaveCount(0);
      const heroBox = await hero.boundingBox();
      const projectsBox = await projects.boundingBox();
      expect(heroBox!.x).toBe(projectsBox!.x);
      expect(heroBox!.width).toBe(projectsBox!.width);
      const contrast = await projects.getByRole('link', { name: 'Read case study' }).first().evaluate(link => {
        const luminance = (color: string) => {
          const rgb = color.match(/\d+/g)!.slice(0, 3).map(Number).map(value => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        const foreground = luminance(getComputedStyle(link).color);
        let container: Element | null = link;
        while (container && getComputedStyle(container).backgroundColor === 'rgba(0, 0, 0, 0)') container = container.parentElement;
        const background = luminance(getComputedStyle(container!).backgroundColor);
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      const targets = await page.locator('.home-page a, .home-page button, .home-page select, .home-page summary').evaluateAll(elements => elements
        .filter(element => element.getClientRects().length > 0)
        .map(element => ({ text: element.textContent || element.getAttribute('aria-label'), height: element.getBoundingClientRect().height })));
      for (const target of targets) expect(target.height, `${target.text} touch target`).toBeGreaterThanOrEqual(44);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: testInfo.outputPath(`home-${name}-${theme}.png`), fullPage: true });
      await page.keyboard.press('Tab');
      await expect(hero.getByRole('button', { name: 'View projects' })).toBeFocused();
      await hero.getByRole('button', { name: 'View projects' }).click();
      await expect(projects).toBeInViewport();
    });
  }
}

test('keeps project links, engineering evidence, themes and translations available', async ({ page }) => {
  await page.goto('/');
  const projects = page.locator('#projects article');
  await expect(projects).toHaveCount(4);
  for (const [name, repository] of [['Loja App', 'Loja_app'], ['Full-Stack Portfolio', 'portfolio'], ['PatchForge', 'PatchForge'], ['Housing Finance GPS', 'housing-finance-gps']]) {
    await expect(projects.filter({ hasText: name }).getByRole('link', { name: 'Source code', exact: true })).toHaveAttribute('href', `https://github.com/Argenis1412/${repository}`);
  }
  await expect(projects.filter({ hasText: 'Housing Finance GPS' })).toContainText('In development; no public demo.');
  await expect(projects.filter({ hasText: 'Housing Finance GPS' }).getByRole('link', { name: 'Read case study' })).toHaveCount(0);
  await projects.filter({ hasText: 'Full-Stack Portfolio' }).getByRole('link', { name: 'Read case study' }).click();
  await expect(page.getByRole('heading', { name: 'Full-Stack Portfolio', exact: true })).toBeFocused();
  await page.getByRole('link', { name: 'Metrics and documented incidents' }).click();
  await expect(page.locator('#metrics time')).toBeVisible();
  await page.goto('/');
  await page.getByRole('combobox').selectOption('es');
  await expect(page.locator('#hero h1')).toHaveText('APIs y sistemas backend.');
  await expect(page.locator('#contact h2')).toHaveText('Contacto');
  await expect(page.locator('#projects').getByText('API de pagos', { exact: false })).toBeVisible();
  await page.getByRole('combobox').selectOption('pt');
  await expect(page.locator('#hero h1')).toHaveText('APIs e sistemas backend.');
  await expect(page.locator('#projects').getByText('API de pagamentos', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle Theme' }).click();
  const storedTheme = await page.evaluate(() => localStorage.getItem('portfolio_theme'));
  await expect(page.locator('html')).toHaveClass(new RegExp(storedTheme!));
});

test('explains evidence sources and opens the existing system without polling on home', async ({ page }) => {
  const metricsRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/metrics/summary')) metricsRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('#projects article')).toHaveCount(4);
  const system = page.locator('#system');
  await expect(system).toContainText('Real HTTP latency');
  await expect(system).toContainText('not server logs or automated recovery actions');
  await expect(system).toContainText('not the current system state');
  expect(metricsRequests).toEqual([]);
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await expect(system).toBeInViewport();
  await system.getByRole('link', { name: 'View metrics and events' }).click();
  await expect(page).toHaveURL(/\/production-evidence$/);
  await expect(page.locator('#metrics time')).toBeVisible();
});

test('shows project loading, failure, retry and empty states', async ({ page }) => {
  let answer: (() => Promise<void>) | undefined;
  await page.route('**/api/v1/projects', async route => {
    await new Promise<void>(resolve => { answer = async () => { await route.fulfill({ status: 500, json: {} }); resolve(); }; });
  });
  await page.goto('/');
  await expect(page.locator('#projects [role=status]')).toContainText('Loading');
  await expect.poll(() => Boolean(answer)).toBe(true);
  await answer!();
  // Complete retries deterministically, then offer a manual retry with an empty response.
  await page.route('**/api/v1/projects', route => route.fulfill({ status: 500, json: {} }));
  await expect(page.locator('#projects').getByRole('button', { name: 'Try again' })).toBeVisible({ timeout: 20000 });
  await page.route('**/api/v1/projects', route => route.fulfill({ json: { projects: [] } }));
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('#projects article')).toHaveCount(0);
  await expect(page.locator('#projects')).toContainText('No projects');
});
