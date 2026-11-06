import { test, expect } from '@playwright/test';

/**
 * Choosing a picture from the app's own library for the page background: the picker shows next to the upload, one click puts the picture behind
 * the live form, and the whole library opens in a dialog. Real browser, on the mock server's builder form.
 * SHOT_DIR=<folder> also saves two screenshots of the picker.
 */
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
});

test('a library picture can be chosen as the page background, and it shows behind the live form', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/forms/e2e-branding/edit?tab=branding');
  await expect(page.getByRole('tablist', { name: 'Branding sections' })).toBeVisible({ timeout: 60000 });

  await page.getByRole('tab', { name: 'Colour' }).click();
  await page.getByRole('button', { name: 'Your own image' }).click();

  const picker = page.getByRole('group', { name: 'Pictures to choose from' });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('button', { name: 'All pictures' })).toBeVisible();
  // the upload box is still there, under the library
  await expect(page.getByText(/Click or drag to upload/i).first()).toBeVisible();
  const shot = process.env.SHOT_DIR;
  if (shot) await page.screenshot({ path: `${shot}/picker-colour-tab.png` });

  await picker.getByRole('button', { name: 'Ocean mist' }).click();
  await expect(picker.getByRole('button', { name: 'Ocean mist' })).toHaveAttribute('aria-pressed', 'true');

  // the live form behind the controls now has the picture
  const frame = page.frameLocator('iframe[title="Live form preview"]');
  await expect(frame.locator('.bg-form-type').first()).toHaveCSS('background-image', /form-pictures\/ocean-mist\.jpg/, { timeout: 30000 });

  // the picture file itself is served (not a broken link)
  const res = await page.request.get('/form-pictures/ocean-mist.jpg');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/jpeg');

  await picker.getByRole('button', { name: 'All pictures' }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose a picture' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Waves', exact: true }).click();
  await expect(dialog.getByRole('listitem')).toHaveCount(6);
  if (shot) await page.screenshot({ path: `${shot}/picker-dialog.png` });
  await dialog.getByRole('button', { name: 'Calm waves' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(frame.locator('.bg-form-type').first()).toHaveCSS('background-image', /form-pictures\/calm-waves\.jpg/, { timeout: 30000 });
});
