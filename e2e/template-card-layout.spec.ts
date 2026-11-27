import { test, expect } from '@playwright/test';

/**
 * The template card on /discover-templates, in a real browser:
 *  - the category chip is under the picture, never overlapped by it, fully inside the card, and shows the short name (no "&")
 *  - on hover the Preview and Use template buttons are painted above the picture and the whole-card link
 * The cards come from the mock backend's gallery (e2e/mockServer.ts).
 */
test('each card keeps its category chip clear of the picture and shows a short category name', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/discover-templates');
  const cards = page.locator('article');
  await expect(cards.first()).toBeVisible({ timeout: 60000 });
  const count = await cards.count();
  expect(count).toBeGreaterThan(1);

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    // a card draws its picture only when it is near the screen, so bring it there first
    await card.scrollIntoViewIfNeeded();
    // the picture's box (a drawn form, or the placeholder while none is drawn): the first block in the card
    const pictureBox = card.locator(':scope > div').first();
    await expect(pictureBox).toBeVisible();
    const box = await card.boundingBox();
    const picture = await pictureBox.boundingBox();
    const chip = card.locator('span.rounded-full').first();
    const chipBox = await chip.boundingBox();
    expect(box && picture && chipBox, `card ${i} has a box, a picture and a chip`).toBeTruthy();
    // under the picture, not over it
    expect(chipBox!.y).toBeGreaterThanOrEqual(picture!.y + picture!.height - 1);
    // fully inside the card
    expect(chipBox!.x).toBeGreaterThanOrEqual(box!.x);
    expect(chipBox!.x + chipBox!.width).toBeLessThanOrEqual(box!.x + box!.width);
    expect(chipBox!.y + chipBox!.height).toBeLessThanOrEqual(box!.y + box!.height);
    // a short name, not "Internal Requests & Inspections"
    const label = (await chip.textContent()) ?? '';
    expect(label.length).toBeGreaterThan(0);
    expect(label).not.toContain('&');
  }
});

test('on hover the Use template button is painted above the picture and the whole-card link', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/discover-templates');
  const card = page.locator('article').first();
  await expect(card).toBeVisible({ timeout: 60000 });
  await card.hover();
  const button = card.getByRole('link', { name: /^Use the .* template$/ });
  await expect(button).toBeVisible();
  const box = (await button.boundingBox())!;
  // what is painted at the middle of the button is the button itself, not the picture or the stretched card link under it
  const topmostIsButton = await button.evaluate((el, p) => {
    const hit = document.elementFromPoint(p.x, p.y);
    return !!hit && (el === hit || el.contains(hit));
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  expect(topmostIsButton).toBe(true);
});
