import { test, expect } from './fixtures';

for (const [language, title, terraform, load] of [
  ['en', 'Documented engineering cases', 'Terraform secret identity collision', 'Local load validation with a limited CPU budget'],
  ['es', 'Casos de ingeniería documentados', 'Colisión de identidad de secretos en Terraform', 'Validación local de carga con CPU limitada'],
  ['pt', 'Casos de engenharia documentados', 'Colisão de identidade de secrets no Terraform', 'Validação local de carga com CPU limitada'],
]) {
  test(`preserves source-backed cases through the old evidence URL in ${language}`, async ({ page }) => {
    const metricsRequests: string[] = [];
    page.on('request', request => { if (request.url().includes('/metrics/summary')) metricsRequests.push(request.url()); });
    await page.addInitScript(value => localStorage.setItem('portfolio_lang', value), language);
    await page.goto('/production-evidence');
    await expect(page).toHaveURL(/\/projects\/portfolio-api$/);
    await expect(page.getByRole('heading', { name: 'Full-Stack Portfolio', exact: true })).toBeFocused();
    const records = page.getByRole('region', { name: title });
    await expect(records.getByRole('heading', { name: terraform })).toBeVisible();
    await expect(records.getByRole('heading', { name: load })).toBeVisible();
    await expect(records.locator('a')).toHaveCount(2);
    await expect(records.locator('a').first()).toHaveAttribute('href', 'https://github.com/Argenis1412/portfolio/blob/main/docs/architecture/INC-009-terraform-resource-collision.md');
    await expect(records.locator('a').last()).toHaveAttribute('href', 'https://github.com/Argenis1412/portfolio/blob/main/benchmarks/results/f9eaa7f-local-20261017/README.md');
    await expect(page.locator('#metrics, #logs, #incident-history')).toHaveCount(0);
    expect(metricsRequests).toEqual([]);
  });
}

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
    test(`reviews ${name} ${theme} documented cases with reduced motion`, async ({ page }, testInfo) => {
      await page.addInitScript(value => localStorage.setItem('portfolio_theme', value), theme);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/production-evidence');
      await expect(page.getByRole('heading', { name: 'Full-Stack Portfolio', exact: true })).toBeFocused();
      const records = page.getByRole('region', { name: 'Documented engineering cases' });
      await expect(records).toContainText('All five latency thresholds failed');
      await expect(records).toContainText('not production SLO compliance or maximum capacity');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${name}-${theme}-cases.png`), fullPage: true });
    });
  }
}
