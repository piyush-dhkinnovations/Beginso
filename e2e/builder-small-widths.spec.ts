import { test, expect } from '@playwright/test';

/**
 * The builder between phone and desktop: from 640px the icon rail adds fields (no second "Add field" button), below it the
 * bottom sheet does, and at every width a field card carries its own drag handle that really reorders.
 */
const SIZES = [
  { width: 390, rail: false },
  { width: 640, rail: true },
  { width: 730, rail: true },
  { width: 1280, rail: true },
];

for (const { width, rail } of SIZES) {
  test(`builder at ${width}px: ${rail ? 'field rail' : 'Add field button'}, and fields drag by their handle`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
    const page = await context.newPage();
    await page.goto(`/forms/e2e-grip-${width}/edit`);

    const first = page.getByRole('button', { name: /^Reorder Original question\./ });
    const second = page.getByRole('button', { name: /^Reorder Second question\./ });
    await expect(first).toBeVisible({ timeout: 60000 });
    await expect(second).toBeVisible();

    const toolbox = page.locator('aside').filter({ has: page.getByTitle('Short Text') });
    await expect(toolbox).toBeVisible({ visible: rail });
    await expect(page.getByRole('button', { name: 'Add field' })).toBeVisible({ visible: !rail });
    // The rail never grows past the screen: its lower icons stay reachable by scrolling it.
    if (rail) expect((await toolbox.boundingBox())!.height).toBeLessThanOrEqual(900);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`builder-${width}.png`) });

    const from = (await second.boundingBox())!;
    const to = (await first.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y, { steps: 15 });
    await page.mouse.up();
    await expect(page.getByRole('button', { name: /^Reorder / }).first()).toHaveAccessibleName(/^Reorder Second question\./);
    await context.close();
  });
}
