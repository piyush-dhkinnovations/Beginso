import { test, expect } from '@playwright/test';

/**
 * A form's own typeface and its heading font, in a real browser: the form font is set on the questions and the title alike, and a heading font
 * changes only the titles. (The page looks up the typefaces by name, so this reads the computed family, not the pixels.)
 */
test('a form with its own typeface (Quicksand) sets the labels and the title in it', async ({ page }) => {
  await page.goto('/f/look-classic-body');
  const label = page.locator('label', { hasText: 'Full name' });
  await expect(label).toBeVisible({ timeout: 60000 });
  expect(await label.evaluate((n) => getComputedStyle(n).fontFamily)).toMatch(/quicksand/i);
  expect(await page.locator('.form-heading').first().evaluate((n) => getComputedStyle(n).fontFamily)).toMatch(/quicksand/i);
});

test('a heading font changes the form title and leaves the questions in the form font', async ({ page }) => {
  await page.goto('/f/look-classic-heading');
  const label = page.locator('label', { hasText: 'Full name' });
  await expect(label).toBeVisible({ timeout: 60000 });
  const title = page.locator('.form-heading').first();
  expect(await title.evaluate((n) => getComputedStyle(n).fontFamily)).toMatch(/playfair/i);
  const labelFont = await label.evaluate((n) => getComputedStyle(n).fontFamily);
  expect(labelFont).toMatch(/dm.?sans/i);
  expect(labelFont).not.toMatch(/playfair/i);
});

test('a form with no heading font keeps its titles in the form font', async ({ page }) => {
  await page.goto('/f/look-classic-none');
  const title = page.locator('.form-heading').first();
  await expect(title).toBeVisible({ timeout: 60000 });
  expect(await title.evaluate((n) => getComputedStyle(n).fontFamily)).toMatch(/dm.?sans/i);
});
