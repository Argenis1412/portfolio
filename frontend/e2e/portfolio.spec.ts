import { test, expect } from './fixtures';

test('aborts requests with retired Chaos headers and records the violation', async ({ page, network }) => {
  await page.goto('/');
  const blocked = await page.evaluate(() => fetch('/api/v1/about', {
    headers: { 'X-Chaos-Preset': 'retired' },
  }).then(() => false, () => true));
  expect(blocked).toBe(true);
  expect(network.unexpected.splice(0)).toEqual([
    `X-Chaos-Preset GET ${new URL('/api/v1/about', page.url()).href}`,
  ]);
});

test('keeps retired metrics and Chaos controls outside the portfolio case study', async ({ page }) => {
  await page.goto('/production-evidence');
  await expect(page).toHaveURL(/\/projects\/portfolio-api$/);
  await expect(page.getByRole('heading', { name: 'Documented engineering cases' })).toBeVisible();
  await expect(page.locator('#metrics, #logs, #incident-history')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'MILD', exact: true })).toHaveCount(0);
  await expect(page.locator('#chaos')).toHaveCount(0);
});

test('submits contact only to the isolated fixture', async ({ page, network }) => {
  await page.goto('/#contact');
  await page.locator('#name').fill('Portfolio test');
  await page.locator('#email').fill('test@example.invalid');
  await page.locator('#subject').fill('Isolated smoke');
  await page.locator('#message').fill('This message is intercepted and never delivered.');
  await page.locator('#contact button[type=submit]').click();
  await expect.poll(() => network.contact.length).toBe(1);
  expect(network.contact[0].idempotencyKey).toBeTruthy();
  expect(network.contact[0].website).toBe('');
  expect(network.contact[0].fax).toBe('');
});
