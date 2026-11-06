import { test, expect } from '@playwright/test';

/**
 * Looks, in a real browser: open the Looks box, use a ready-made look, see the layout and the live form change, and undo it.
 * The mock server has no saved-styles endpoint, so only the ready-made tab is exercised here (My styles is covered by unit tests and the backend's).
 */
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
});

test('a ready-made look changes the layout and the live form, and Undo puts them back', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/forms/e2e-branding/edit?tab=branding');
  await expect(page.getByRole('tablist', { name: 'Branding sections' })).toBeVisible({ timeout: 60000 });

  const frame = page.frameLocator('iframe[title="Live form preview"]');
  const card = () => frame.locator('.form-look').first().evaluate((n) => getComputedStyle(n).getPropertyValue('--surface-card').trim());
  await expect(frame.locator('label').first()).toBeVisible({ timeout: 60000 });
  expect(await card()).not.toBe('#111827');

  await page.getByRole('button', { name: /Looks/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Looks' });
  await expect(dialog.getByRole('listitem')).toHaveCount(12);
  await dialog.getByRole('button', { name: 'Use the Midnight look' }).click();
  await expect(dialog).toHaveCount(0);

  // the layout is now Card Stack, and the live form wears the dark card
  await page.getByRole('tab', { name: 'Layout', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Layout' }).getByRole('button', { name: /Card Stack/ })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(card, { timeout: 30000 }).toBe('#111827');

  // Undo, from the message that says the look was applied
  const toast = page.getByRole('status').filter({ hasText: 'Midnight look applied' });
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('group', { name: 'Layout' }).getByRole('button', { name: /Classic/ })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(card, { timeout: 30000 }).not.toBe('#111827');
});
