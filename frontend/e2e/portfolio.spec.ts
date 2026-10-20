import { test, expect } from './fixtures';

test('shows measured metrics without retired controls', async ({ page }) => {
  await page.goto('/production-evidence');
  await expect(page.locator('#metrics').getByText('44ms', { exact: true })).toBeVisible();
  await expect(page.locator('#metrics time')).toBeVisible();
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
