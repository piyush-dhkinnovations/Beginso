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

/** Dragging a field type off the icon rail: the floating chip stays readable and the blank space under the fields takes the drop. */
async function openBuilder(browser: import('@playwright/test').Browser, id: string, hasTouch = false) {
  const context = await browser.newContext({ viewport: { width: 700, height: 900 }, hasTouch });
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const page = await context.newPage();
  await page.goto(`/forms/${id}/edit`);
  await expect(page.getByRole('button', { name: /^Reorder Second question\./ })).toBeVisible({ timeout: 60000 });
  return { context, page };
}

test('rail drag: one-line chip, and a drop in the blank space below the last field adds it', async ({ browser }, testInfo) => {
  const { context, page } = await openBuilder(browser, 'e2e-grip-railmouse');
  const from = (await page.getByTitle('Yes / No').boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(400, 870, { steps: 20 });

  const chip = page.locator('div.pointer-events-none.cursor-grabbing');
  await expect(chip).toHaveText('Yes / No');
  const box = (await chip.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(56);
  expect(box.width).toBeGreaterThanOrEqual(100);
  await page.screenshot({ path: testInfo.outputPath('rail-drag.png') });

  await page.mouse.up();
  await expect(page.getByRole('button', { name: /^Reorder / })).toHaveCount(3);
  await context.close();
});

test('rail drag by touch: press, hold and drag adds the field', async ({ browser }) => {
  const { context, page } = await openBuilder(browser, 'e2e-grip-railtouch', true);
  const cdp = await context.newCDPSession(page);
  // The top icon, dragged steeply down: the direction a finger takes to the end of the form.
  const from = (await page.getByTitle('Short Text').boundingBox())!;
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const end = { x: 400, y: 760 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  await page.waitForTimeout(350);
  for (let i = 1; i <= 20; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + ((end.x - start.x) * i) / 20, y: start.y + ((end.y - start.y) * i) / 20 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('button', { name: /^Reorder / })).toHaveCount(3);
  await context.close();
});

test('by touch, the grip drags at once and a swipe on the rail scrolls it', async ({ browser }) => {
  const { context, page } = await openBuilder(browser, 'e2e-grip-gripswipe', true);
  const cdp = await context.newCDPSession(page);
  const swipe = async (a: { x: number; y: number }, b: { x: number; y: number }) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
    for (let i = 1; i <= 15; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + ((b.x - a.x) * i) / 15, y: a.y + ((b.y - a.y) * i) / 15 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const centre = async (name: RegExp) => {
    const box = (await page.getByRole('button', { name }).boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };

  const first = await centre(/^Reorder Original question\./);
  await swipe(await centre(/^Reorder Second question\./), { x: first.x, y: first.y - 20 });
  await expect(page.getByRole('button', { name: /^Reorder / }).first()).toHaveAccessibleName(/^Reorder Second question\./);

  const rail = page.locator('aside').filter({ has: page.getByTitle('Short Text') });
  const icon = (await page.getByTitle('Yes / No').boundingBox())!;
  const from = { x: icon.x + icon.width / 2, y: icon.y + icon.height / 2 };
  await swipe(from, { x: from.x, y: from.y - 250 });
  await expect.poll(() => rail.evaluate((el) => el.scrollTop + window.scrollY)).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: /^Reorder / })).toHaveCount(2);
  await context.close();
});
