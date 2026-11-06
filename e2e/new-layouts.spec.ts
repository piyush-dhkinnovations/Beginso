import { test, expect } from '@playwright/test';

/**
 * The newer layouts in a real browser (the mock server's /f/look-<layout>-<look> forms): each fits a 320px phone with nothing scrolling sideways, the
 * one-question-at-a-time ones go on and back, the Sidebar lists the pages, and Split Feature puts its picture on the chosen side.
 */
const NEW = ['chat', 'sidebar', 'open', 'focus'] as const;

for (const layout of NEW) {
  for (const width of [320, 768, 1280]) {
    test(`${layout} at ${width}px: the form shows and nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/f/look-${layout}-none`);
      await expect(page.getByLabel(/Full name/)).toBeVisible({ timeout: 60000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'horizontal overflow').toBeLessThanOrEqual(0);
    });
  }
}

for (const layout of ['chat', 'focus'] as const) {
  test(`${layout}: one question at a time, with a counter, Next, and Back that keeps the answer`, async ({ page }) => {
    await page.goto(`/f/look-${layout}-none`);
    await expect(page.getByText('Question 1 of 5')).toBeVisible({ timeout: 60000 });
    await expect(page.getByLabel(/Email address/)).toHaveCount(0);
    await page.getByLabel(/Full name/).fill('Asha');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Question 2 of 5')).toBeVisible();
    await expect(page.getByLabel(/Email address/)).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByLabel(/Full name/)).toHaveValue('Asha');
    await expect(page.getByRole('progressbar', { name: 'Form progress' })).toBeVisible();
  });
}

test('focus: the question is set large, larger than a label in the other layouts', async ({ page }) => {
  await page.goto('/f/look-focus-none');
  const label = page.locator('label', { hasText: 'Full name' });
  await expect(label).toBeVisible({ timeout: 60000 });
  const size = await label.evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
  expect(size).toBeGreaterThanOrEqual(22);
});

test('open: no card around the form', async ({ page }) => {
  await page.goto('/f/look-open-none');
  await expect(page.getByLabel(/Full name/)).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.form-card')).toHaveCount(0);
});

test('sidebar: a multi-page form lists its pages by name and marks the current one', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/f/look-sidebar-multi');
  const nav = page.getByRole('navigation', { name: 'Form steps' });
  await expect(nav).toBeVisible({ timeout: 60000 });
  await expect(nav.getByText('Your details')).toBeVisible();
  await expect(nav.getByText('Your feedback')).toBeVisible();
  await expect(nav.locator('[aria-current="step"]')).toContainText('Your details');
});

test('sidebar: on a phone the list is one line above the form', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/f/look-sidebar-multi');
  await expect(page.getByLabel(/Full name/)).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('navigation', { name: 'Form steps' })).toBeHidden();
  await expect(page.getByText(/Step 1 of 2 · Your details/)).toBeVisible();
});

test('split feature: the picture panel is on the left by default and on the right when chosen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const sides = async (slug: string) => {
    await page.goto(slug);
    const form = page.getByLabel(/Full name/);
    await expect(form).toBeVisible({ timeout: 60000 });
    const panel = (await page.locator('.split-panel').boundingBox())!;
    const body = (await page.locator('.split-form').boundingBox())!;
    return panel.x < body.x ? 'left' : 'right';
  };
  expect(await sides('/f/look-split_feature-none')).toBe('left');
  expect(await sides('/f/look-split_feature-panelend')).toBe('right');
});

test('split feature: the picture width is your own share of the card, on either side', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const share = async (slug: string) => {
    await page.goto(slug);
    await expect(page.getByLabel(/Full name/)).toBeVisible({ timeout: 60000 });
    const panel = (await page.locator('.split-panel').boundingBox())!;
    const card = (await page.locator('.form-card').first().boundingBox())!;
    return Math.round((panel.width / card.width) * 100);
  };
  expect(await share('/f/look-split_feature-none')).toBe(40);
  expect(Math.abs((await share('/f/look-split_feature-splitnarrow')) - 30)).toBeLessThanOrEqual(1);
  expect(Math.abs((await share('/f/look-split_feature-splitwideend')) - 70)).toBeLessThanOrEqual(1);
});

test('split feature on a phone: the panel stays above the form whichever side is chosen', async ({ page }) => {
  await page.setViewportSize({ width: 768 - 1, height: 900 });
  await page.goto('/f/look-split_feature-panelend');
  await expect(page.getByLabel(/Full name/)).toBeVisible({ timeout: 60000 });
  const panel = (await page.locator('.split-panel').boundingBox())!;
  const body = (await page.locator('.split-form').boundingBox())!;
  expect(panel.y).toBeLessThan(body.y);
});
