import { test, expect } from '@playwright/test';

/**
 * The pages under the public top bar (Terms, Privacy, Cookie Policy, the blog, the templates) start right below it: a gap of about 50 to 60px,
 * not the 100 to 150px of empty space they used to have. Measured in a real browser on a policy page, which needs no backend.
 */
for (const width of [390, 1440]) {
  test(`${width}px: the page starts just below the top bar, with no big empty gap`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/terms');
    const bar = (await page.locator('header').first().boundingBox())!;
    const crumb = (await page.getByRole('navigation', { name: 'Breadcrumb' }).boundingBox())!;
    const gap = crumb.y - (bar.y + bar.height);
    expect(gap, 'space between the top bar and the page').toBeGreaterThan(16);
    expect(gap, 'space between the top bar and the page').toBeLessThan(72);
  });
}
