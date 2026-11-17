import { test, expect } from '@playwright/test';

// The public template page: what the template is, what is inside it, the action next to the title, and a preview of the real form.
// The preview is ONE box: the form's own page (its colour) covers the whole stage at every device width, and only the form changes size.
const D = process.env.SHOTS ?? '';

test('the template page shows the details and a preview whose page fills the whole stage on every device', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/discover-templates/volunteer-signup');
  await expect(page.getByRole('heading', { level: 1, name: 'Volunteer Signup' })).toBeVisible({ timeout: 60000 });

  // the details
  await expect(page.getByText('6 questions').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What is inside' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Which days can you help?' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Use this template' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Open full preview/ })).toHaveAttribute('href', '/discover-templates/volunteer-signup/preview');

  const frame = page.frameLocator('iframe[title="Volunteer Signup preview"]');
  const stage = page.locator('iframe[title="Volunteer Signup preview"]').locator('xpath=ancestor::div[contains(@class,"overflow-hidden")][1]');
  await expect(frame.locator('label').first()).toBeVisible({ timeout: 60000 });

  for (const device of ['Desktop', 'Tablet', 'Mobile']) {
    await page.getByRole('tab', { name: device }).click();
    await expect(frame.locator('label').first()).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(400);
    if (D) await page.screenshot({ path: `${D}template-${device.toLowerCase()}.png` });
    // the stage is painted with the form's page (a gradient image) from edge to edge, and the iframe on it is see-through
    const paint = await stage.evaluate((el) => ({ image: getComputedStyle(el).backgroundImage, w: el.getBoundingClientRect().width }));
    expect(paint.image, `${device}: the stage carries the page`).toContain('gradient');
    const box = await page.locator('iframe[title="Volunteer Signup preview"]').boundingBox();
    expect(box!.width, `${device}: the form is no wider than the stage`).toBeLessThanOrEqual(paint.w + 1);
    if (device === 'Mobile') expect(box!.width, `${device}: the form is narrower than the stage`).toBeLessThan(paint.w - 40);
    // the form is in the middle of the page, not at the top of it
    const cards = await frame.locator('.form-card').all();
    const first = (await cards[0].boundingBox())!;
    const last = (await cards[cards.length - 1].boundingBox())!;
    const card = { y: first.y, height: last.y + last.height - first.y };
    const frameBox = (await page.locator('iframe[title="Volunteer Signup preview"]').boundingBox())!;
    const above = card.y - frameBox.y;
    const below = frameBox.y + frameBox.height - (card.y + card.height);
    // (a form taller than the stage, such as a phone's single column, keeps its margin above it and scrolls instead)
    if (below >= 0) expect(Math.abs(above - below), `${device}: space above and below the form is about equal (${Math.round(above)} / ${Math.round(below)})`).toBeLessThan(40);
    else expect(above, `${device}: a tall form does not touch the top`).toBeGreaterThanOrEqual(16);
    const seeThrough = await frame.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(seeThrough, `${device}: the frame itself paints nothing`).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  }
});

test('a form taller than the preview keeps its margin above it and scrolls, with no scrollbar drawn over the page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/discover-templates/long-survey');
  await expect(page.getByRole('heading', { level: 1, name: 'Long Survey' })).toBeVisible({ timeout: 60000 });
  const iframe = page.locator('iframe[title="Long Survey preview"]');
  const frame = page.frameLocator('iframe[title="Long Survey preview"]');
  await expect(frame.locator('label').first()).toBeVisible({ timeout: 60000 });
  await page.waitForTimeout(400);
  if (D) await page.screenshot({ path: `${D}template-tall.png` });

  const card = (await frame.locator('.form-card').first().boundingBox())!;
  const box = (await iframe.boundingBox())!;
  expect(card.y - box.y, 'the form does not touch the top of the preview').toBeGreaterThanOrEqual(16);

  const scroller = await frame.locator('div.fixed.inset-0').first().evaluate((el) => ({ scrolls: el.scrollHeight > el.clientHeight, wide: el.offsetWidth - el.clientWidth }));
  expect(scroller.scrolls, 'it scrolls inside the preview').toBe(true);
  expect(scroller.wide, 'and draws no scrollbar').toBe(0);
});

test('the full preview opened on its own fills the whole window with the form\'s page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/discover-templates/volunteer-signup/preview');
  await expect(page.locator('label').first()).toBeVisible({ timeout: 60000 });
  const page_ = await page.locator('.bg-form-type').first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { bottom: r.bottom, height: window.innerHeight };
  });
  expect(page_.bottom, 'the green page reaches the bottom of the window, with no grey below it').toBeGreaterThanOrEqual(page_.height - 1);
});
