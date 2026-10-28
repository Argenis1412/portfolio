import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';

const load = (name: string) => JSON.parse(readFileSync(new URL(`../../backend/data/${name}.json`, import.meta.url), 'utf8'));
const portfolio = load('projects').find((project: { id: string }) => project.id === 'portfolio-api');

const languages = [
  {
    id: 'en',
    titles: ['Cached JSON vs. SQL', 'Redis Streams vs. background tasks', 'Shared Redis vs. local memory'],
    limits: ['transactional storage', 'no durability or automatic retries', 'lost on restart'],
    acceptance: 'HTTP acceptance does not prove inbox delivery.',
  },
  {
    id: 'pt',
    titles: ['JSON em cache vs. SQL', 'Redis Streams vs. tarefas em segundo plano', 'Redis compartilhado vs. memória local'],
    limits: ['armazenamento transacional', 'não tem durabilidade nem novas tentativas automáticas', 'se perde ao reiniciar'],
    acceptance: 'Aceitação HTTP não comprova entrega na caixa de entrada.',
  },
  {
    id: 'es',
    titles: ['JSON en caché vs. SQL', 'Redis Streams vs. tareas en segundo plano', 'Redis compartido vs. memoria local'],
    limits: ['almacenamiento transaccional', 'no tiene durabilidad ni reintentos automáticos', 'se pierde al reiniciar'],
    acceptance: 'La aceptación HTTP no demuestra entrega en la bandeja de entrada.',
  },
];

for (const language of languages) {
  test(`shares the project introduction and shows implemented trade-offs in ${language.id}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('portfolio_lang', value), language.id);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const project = page.locator('#projects article').filter({ has: page.getByRole('heading', { name: 'Full-Stack Portfolio', exact: true }) });
    const description = portfolio.short_description[language.id];
    await expect(project.getByText(description, { exact: true })).toBeVisible();
    await expect(project.getByRole('listitem')).toHaveText(['Python', 'FastAPI', 'Redis Streams', 'React 19']);
    await project.locator('a[href="/projects/portfolio-api"]').click();
    await expect(page.getByRole('heading', { name: 'Full-Stack Portfolio', exact: true })).toBeFocused();
    await expect(page.getByText(description, { exact: true })).toBeVisible();

    const disclosure = page.locator('details').filter({ has: page.locator('#tradeoffs') });
    await expect(disclosure).not.toHaveAttribute('open');
    await disclosure.locator('summary').click();
    const tradeoffs = page.locator('#tradeoffs');
    await expect(tradeoffs.getByRole('heading', { level: 3 })).toHaveText(language.titles);
    for (const limit of language.limits) {
      await expect(tradeoffs.getByText(limit, { exact: false })).toBeVisible();
    }
    await expect(tradeoffs.getByText(language.acceptance, { exact: false })).toBeVisible();
    await expect(tradeoffs).not.toContainText(/STRESS|FAILURE|100\s?ms|O\(1\)|Chaos|ACTIVE|OPTIMIZED|ENFORCED/);
    await expect(page.locator('#metrics, #logs, #chaos')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await disclosure.locator('summary').click();
    await expect(disclosure).not.toHaveAttribute('open');
  });
}

for (const [device, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } })) {
  for (const theme of ['dark', 'light']) {
    test(`keeps trade-offs readable on ${device} in ${theme} theme`, async ({ page }, testInfo) => {
      await page.addInitScript(value => {
        localStorage.setItem('portfolio_theme', value);
        localStorage.setItem('portfolio_lang', 'es');
      }, theme);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/projects/portfolio-api');
      const disclosure = page.locator('details').filter({ has: page.locator('#tradeoffs') });
      await disclosure.locator('summary').click();
      await expect(page.locator('#tradeoffs').getByRole('heading', { level: 3 })).toHaveCount(3);
      for (const card of await page.locator('#tradeoffs h3').all()) {
        await expect(card.locator('..')).toHaveCSS('opacity', '1');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: testInfo.outputPath(`case-${device}-${theme}.png`), fullPage: true });
      await page.locator('#tradeoffs').screenshot({ path: testInfo.outputPath(`tradeoffs-${device}-${theme}.png`) });
    });
  }
}

test('reloads the page to recover an experience load failure', async ({ page }) => {
  await page.route('**/api/v1/experiences', route => route.fulfill({ status: 500, json: {} }));
  await page.goto('/');
  const disclosure = page.locator('#about details').filter({ has: page.locator('summary', { hasText: 'Experience and education' }) });
  await disclosure.locator('summary').click();
  await expect(disclosure.getByRole('alert')).toContainText('This section could not be loaded.', { timeout: 20000 });

  await page.route('**/api/v1/experiences', route => route.fulfill({ json: { experiences: load('experiences') } }));
  await Promise.all([
    page.waitForEvent('domcontentloaded'),
    disclosure.getByRole('button', { name: 'Reload page' }).click(),
  ]);
  await disclosure.locator('summary').click();
  await expect(disclosure.locator('#experience')).toContainText('Ademicon');
  await expect(disclosure.getByRole('alert')).toHaveCount(0);
});
