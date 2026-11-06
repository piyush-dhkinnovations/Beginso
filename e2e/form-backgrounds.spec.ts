import { test, expect } from '@playwright/test';

// Backgrounds and the cover height (branding.theme.background, theme.cover) in a real page: a gradient with the owner's colours and angle, a picture
// darkened and blurred as layers behind the page, and a cover banner of the owner's own height. A form that sets none keeps the page as it was.

const root = (page: import('@playwright/test').Page) => page.locator('div.bg-form-type').first();

test.describe('backgrounds and the cover height', () => {
  test('a gradient takes the owner\'s two colours and angle', async ({ page }) => {
    await page.goto('/f/look-classic-gradient');
    await expect(page.getByLabel(/Full name/)).toBeVisible();
    const bg = await root(page).evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('linear-gradient(');
    expect(bg).toContain('90deg');
    expect(bg).toMatch(/rgb\(255, 0, 0\)/);
    expect(bg).toMatch(/rgb\(0, 0, 255\)/);
  });

  test('a picture darkened and blurred is two layers behind the page, and the form on top stays sharp and usable', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto('/f/look-classic-veil');
    const name = page.getByLabel(/Full name/);
    await expect(name).toBeVisible();
    // the page itself has no picture; the layers draw it
    expect(await root(page).evaluate((el) => getComputedStyle(el).backgroundImage)).toBe('none');
    const layers = page.locator('div.bg-form-type > div[aria-hidden="true"].fixed');
    await expect(layers).toHaveCount(1);
    const image = layers.locator('> div').nth(0);
    const veil = layers.locator('> div').nth(1);
    expect(await image.evaluate((el) => getComputedStyle(el).filter)).toBe('blur(10px)');
    expect(await veil.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0.4)');
    // covering the window
    const box = (await layers.boundingBox())!;
    // the page's own area: the same as every other page background, which stops where the reserved scrollbar strip begins
    const area = await page.evaluate(() => {
      const r = document.documentElement.getBoundingClientRect();
      return { w: r.width, h: window.innerHeight };
    });
    expect(Math.abs(box.width - area.w)).toBeLessThan(2);
    expect(Math.abs(box.height - area.h)).toBeLessThan(2);
    // behind the form: the form's own text is not blurred, and typing works
    expect(await name.evaluate((el) => getComputedStyle(el).filter)).toBe('none');
    await name.fill('Asha');
    await expect(name).toHaveValue('Asha');
  });

  test('a cover banner has the owner\'s height', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto('/f/look-classic-tall');
    await expect(page.getByLabel(/Full name/)).toBeVisible();
    const banner = page.locator('div.relative.w-full.overflow-hidden').first();
    const box = (await banner.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(320);
    expect(box.height).toBeLessThan(330);
  });

  test('a form that sets none of it keeps the page as it was: no layers, the usual banner', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto('/f/look-classic-none');
    await expect(page.getByLabel(/Full name/)).toBeVisible();
    await expect(page.locator('div.bg-form-type > div[aria-hidden="true"].fixed')).toHaveCount(0);
    const banner = page.locator('div.relative.w-full.overflow-hidden').first();
    const box = (await banner.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(176);
    expect(box.height).toBeLessThan(260);
  });
});
