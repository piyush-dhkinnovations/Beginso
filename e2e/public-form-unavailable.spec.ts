import { test, expect } from '@playwright/test';

/**
 * Requirement 7 (Form Unavailable). A draft, an archived form and a link that never existed are one indistinguishable 404, so a
 * link never confirms that a draft exists. A form its OWNER closed, whose closing date has passed, or that reached its response
 * limit says so (FIX-03): the respondent is told the real reason. These two groups are deliberately different screens.
 */

test.describe('Public form — unavailable screen', () => {
  test('a 404 (unknown/draft/closed) slug shows the generic unavailable screen', async ({ page }) => {
    await page.goto('/f/mock-not-found');
    await expect(page.getByText('Form not found')).toBeVisible();
    await expect(page.getByText('Check the link you were given, or contact the person who shared it.')).toBeVisible();
  });

  test('a form past its closeDate says its closing date has passed (client-side courtesy check), unlike the 404 screen', async ({ page }) => {
    await page.goto('/f/mock-closed-date');
    await expect(page.getByText("This form's closing date has passed")).toBeVisible();
    await expect(page.getByText('It stopped accepting responses on the date its owner set.', { exact: false })).toBeVisible();
    await expect(page.getByText('Form not found')).not.toBeVisible();
    await expect(page.locator('input, textarea, select')).toHaveCount(0);
  });

  test('a backend failure is not mislabeled as an unavailable form', async ({ page }) => {
    await page.goto('/f/mock-load-500');
    await expect(page.getByRole('heading', { name: 'Unable to load this form' })).toBeVisible();
    await expect(page.getByText('Form unavailable')).not.toBeVisible();
  });

  test('the unavailable screen never renders any form field', async ({ page }) => {
    await page.goto('/f/mock-not-found');
    await expect(page.locator('input, textarea, select')).toHaveCount(0);
  });

  test('no horizontal overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/f/mock-not-found');
    await expect(page.getByText('Form not found')).toBeVisible();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
