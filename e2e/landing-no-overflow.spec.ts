import { test, expect } from '@playwright/test';

/** QA A1-05: at tablet width the landing page was 44px wider than the screen (the three "Build, share, track" cards). */
for (const width of [390, 768, 1024, 1440]) {
  test(`landing page has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(sw, 'page is wider than the screen').toBeLessThanOrEqual(cw);
  });
}
