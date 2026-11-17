import { test, expect } from '@playwright/test';

// The app is in its dark theme, and every picture of a form in it is still drawn the way the form really looks: light.
test.beforeEach(async ({ context, page }) => {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('beginso.theme', 'dark');
    } catch {
      /* private window */
    }
  });
});

const lightness = (rgb: string) => {
  const m = rgb.match(/\d+/g)!.map(Number);
  return (m[0] + m[1] + m[2]) / 3;
};

test('in the dark theme the Looks tiles and the layout and card tiles show the form light', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/forms/e2e-branding/edit?tab=branding');
  await expect(page.getByRole('tablist', { name: 'Branding sections' })).toBeVisible({ timeout: 60000 });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // a layout tile (the first): its picture is on a light page
  const tile = page.locator('[data-theme="light"]').first();
  expect(await tile.evaluate((el) => getComputedStyle(el).getPropertyValue('--surface-card').trim().toLowerCase())).toMatch(/^#f{3}(f{3})?$/);

  // the Looks dialog: the Clean look's card is white, not the dark card of the app
  await page.getByRole('button', { name: /Looks/ }).click();
  const card = page.getByRole('dialog', { name: 'Looks' }).locator('.form-card').first();
  await expect(card).toBeVisible();
  expect(lightness(await card.evaluate((el) => getComputedStyle(el).backgroundColor))).toBeGreaterThan(200);
});

test('in the dark theme the live preview is the form in its own light look', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/forms/e2e-branding/edit?tab=branding');
  const frame = page.frameLocator('iframe[title="Live form preview"]');
  await expect(frame.locator('label').first()).toBeVisible({ timeout: 60000 });
  expect(lightness(await frame.locator('.form-card').first().evaluate((el) => getComputedStyle(el).backgroundColor))).toBeGreaterThan(200);
});

test('a look that is dark by its own design stays dark when the app is dark (the light scope does not force it light)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/forms/e2e-branding/edit?tab=branding');
  await expect(page.getByRole('tablist', { name: 'Branding sections' })).toBeVisible({ timeout: 60000 });
  await page.getByRole('button', { name: /Looks/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Looks' });
  const cardOf = (name: string) => dialog.getByRole('listitem').filter({ hasText: name }).locator('.form-card').first();
  await expect(cardOf('Clean')).toBeVisible();
  expect(lightness(await cardOf('Clean').evaluate((el) => getComputedStyle(el).backgroundColor)), 'Clean is light').toBeGreaterThan(200);
  expect(lightness(await cardOf('Midnight').evaluate((el) => getComputedStyle(el).backgroundColor)), 'Midnight is dark').toBeLessThan(80);
});
