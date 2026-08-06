import { test, expect } from '@playwright/test';

/**
 * Requirement 7 (Form Unavailable) — a 404 slug and a past-closeDate slug must
 * render the identical screen, never revealing which case applies.
 */

test.describe('Public form — unavailable screen', () => {
  test('a 404 (unknown/draft/closed) slug shows the generic unavailable screen', async ({ page }) => {
    await page.goto('/f/mock-not-found');
    await expect(page.getByText('This form is not currently accepting responses.')).toBeVisible();
    await expect(page.getByText('If you believe this is an error, please contact the form owner.')).toBeVisible();
  });

  test('a form past its closeDate shows the identical unavailable screen (client-side courtesy check)', async ({ page }) => {
    await page.goto('/f/mock-closed-date');
    await expect(page.getByText('This form is not currently accepting responses.')).toBeVisible();
    await expect(page.getByText('If you believe this is an error, please contact the form owner.')).toBeVisible();
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
    await expect(page.getByText('This form is not currently accepting responses.')).toBeVisible();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
