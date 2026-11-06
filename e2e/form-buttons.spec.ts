import { test, expect } from '@playwright/test';

// Buttons and details (branding.theme.buttons, labels, progress, footer) in a real page: the size, the width, the lift on hover, the owner's words,
// the step list and the note are drawn, and a form that sets none of them is drawn as it always was.

test.describe('buttons and details', () => {
  test('big buttons as wide as their words, the owner\'s words, a step list and a note', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto('/f/look-classic-buttons');
    const next = page.getByRole('button', { name: 'Continue' });
    await expect(next).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toHaveCount(0);

    // a step list instead of the bar
    await expect(page.getByRole('list', { name: 'Step 1 of 2' })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveCount(0);

    // large: at least 52px tall; auto width: much narrower than the form's card
    const box = (await next.boundingBox())!;
    const card = (await page.locator('form').boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(51);
    expect(box.width).toBeLessThan(card.width / 2);
    // at the end of the row
    expect(box.x + box.width).toBeGreaterThan(card.x + card.width - 80);

    // lift on hover
    const before = await next.evaluate((el) => getComputedStyle(el).transform);
    await next.hover();
    await expect.poll(() => next.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);

    // the note under the form, as plain text
    await expect(page.getByText('Questions? Write to hello@example.com')).toBeVisible();

    // go through to the end: Go back and Send it
    await page.getByLabel(/Full name/).fill('Asha');
    await page.getByLabel(/Email address/).fill('asha@example.com');
    await next.click();
    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Step 2 of 2' })).toBeVisible();
  });

  test('on a phone the buttons are full width again', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/f/look-classic-buttons');
    const next = page.getByRole('button', { name: 'Continue' });
    const box = (await next.boundingBox())!;
    const card = (await page.locator('form').boundingBox())!;
    expect(box.width).toBeGreaterThan(card.width * 0.8);
  });

  test('a form that sets none of it is drawn as before: Next fills the row, a bar for progress, no note', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto('/f/look-classic-multi');
    const next = page.getByRole('button', { name: 'Next' });
    const box = (await next.boundingBox())!;
    const card = (await page.locator('form').boundingBox())!;
    expect(box.width).toBeGreaterThan(card.width * 0.8);
    await expect(page.getByRole('progressbar')).toBeVisible();
    await expect(page.getByText('Questions? Write to')).toHaveCount(0);
  });
});
