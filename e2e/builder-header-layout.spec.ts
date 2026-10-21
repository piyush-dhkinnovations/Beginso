import { test, expect } from '@playwright/test';

/**
 * QA A12-001: at 390px the form icon was squeezed on top of the Preview button and the status badge sat behind it. Real browser,
 * real layout: nothing in the builder header may overlap anything else, and the header may not be wider than the screen.
 */
const SIZES = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const size of SIZES) {
  test(`builder header: no overlaps and nothing clipped at ${size.name} (${size.width}px)`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
    const page = await context.newPage();
    await page.goto(`/forms/e2e-header-${size.name}/edit`);
    const header = page.locator('header').filter({ has: page.getByRole('textbox', { name: 'Form name' }) });
    await expect(header).toBeVisible({ timeout: 60000 });

    const parts = {
      back: header.getByRole('button', { name: /Back to/ }),
      title: header.getByRole('textbox', { name: 'Form name' }),
      status: header.getByText(/^(Draft|Published|Closed)$/),
      preview: header.getByRole('button', { name: 'Preview' }),
      more: header.getByRole('button', { name: 'More form actions' }),
    };
    const boxes: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const [key, locator] of Object.entries(parts)) {
      const box = await locator.first().boundingBox();
      expect(box, `${key} is visible`).not.toBeNull();
      boxes[key] = box!;
      // Fully inside the screen: Save/Preview must never be cut off at the edge.
      expect(box!.x, `${key} left edge`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `${key} right edge`).toBeLessThanOrEqual(size.width);
    }
    const overlaps = (a: typeof boxes.back, b: typeof boxes.back) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const keys = Object.keys(boxes);
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        expect(overlaps(boxes[keys[i]], boxes[keys[j]]), `${keys[i]} overlaps ${keys[j]}`).toBe(false);
      }
    }
    // The form name must be readable, not shrunk to a few letters.
    expect(boxes.title.width).toBeGreaterThanOrEqual(100);
    await context.close();
  });
}
