import { test, expect, type Page } from '@playwright/test';

/** Per-question cards on a form's Insights page: drag them by the handle, pick a size and colour from the card menu, and all of it survives a reload. */
const choice = (fieldId: string, label: string, order: number) => ({ fieldId, pageId: 'p1', label, type: 'dropdown', options: ['General', 'VIP'], required: false, deleted: false, order });

async function mockInsights(page: Page) {
  const fields = [
    choice('q1', 'Ticket', 0),
    choice('q2', 'Dietary Preference', 1),
    { fieldId: 'q3', pageId: 'p1', label: 'Team Size', type: 'number', required: false, deleted: false, order: 2 },
  ];
  const options = [{ option: 'General', count: 1 }, { option: 'VIP', count: 1 }];
  const form = {
    _id: 'e2e-layout', workspaceId: null, title: 'E2E layout', status: 'published', schemaVersion: 1, responseCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', pages: [{ id: 'p1', order: 0 }], branding: {}, settings: {}, fields,
  };
  const questions = [
    { fieldId: 'q1', label: 'Ticket', options, totalAnswered: 2 },
    { fieldId: 'q2', label: 'Dietary Preference', options, totalAnswered: 2 },
    { fieldId: 'q3', label: 'Team Size', options: [], numeric: { count: 2, average: 4, min: 3, max: 5, sum: 8 } },
  ];
  await page.route('**/api/backend/api/forms/e2e-layout', (route) => route.fulfill({ json: form }));
  await page.route('**/api/backend/api/forms/e2e-layout/charts*', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/backend/api/analytics/**', (route) => {
    const url = route.request().url();
    // The backend's own shapes (see src/services/analytics.ts).
    const summaries = questions.map(({ options: opts, numeric, ...q }) => ({ ...q, summary: { options: opts.map((o) => ({ label: o.option, count: o.count })), ...(numeric ? { numeric } : {}) } }));
    if (url.includes('/questions')) return route.fulfill({ json: { success: true, data: { questions: summaries } } });
    if (url.includes('/trends')) return route.fulfill({ json: { success: true, points: [], dateRange: { bucket: 'day' } } });
    return route.fulfill({ json: { success: true, data: { total: 2, completed: 2, in_progress: 0, new: 0 } } });
  });
}

test('question cards can be resized and dragged, and stay that way after a reload', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const page = await context.newPage();
  await mockInsights(page);
  await page.goto('/forms/e2e-layout/insights');

  const section = page.getByRole('region', { name: 'Per-Question Breakdown' });
  const titles = section.getByRole('heading', { level: 4 });
  await expect(titles).toHaveText(['Ticket', 'Dietary Preference', 'Team Size'], { timeout: 60000 });
  // The card is the grid cell: the heading's nearest ancestor that carries a column span.
  const widthOf = async (name: string) => (await section.locator('div[class*="col-span"]').filter({ has: page.getByRole('heading', { name }) }).boundingBox())!.width;
  const pick = async (name: string, option: string) => {
    const trigger = section.getByRole('button', { name: `Options for ${name}` });
    // The menu closes when the page scrolls, so finish scrolling to its button before opening it.
    await trigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await trigger.click();
    await page.getByRole('menuitemradio', { name: option }).click();
  };
  const barFill = (name: string) =>
    section.locator('div[class*="col-span"]').filter({ has: page.getByRole('heading', { name }) }).locator('svg[role="group"] rect[height="18"]').nth(1).evaluate((el) => getComputedStyle(el).fill);

  const medium = await widthOf('Ticket');
  await pick('Ticket', 'Large');
  expect(await widthOf('Ticket')).toBeGreaterThan(medium * 1.9);
  await pick('Ticket', 'Small');
  expect(await widthOf('Ticket')).toBeLessThan(medium * 0.75);
  await pick('Dietary Preference', 'Small');
  await pick('Team Size', 'Small');

  const blue = await barFill('Ticket');
  await pick('Ticket', 'Green');
  const green = await barFill('Ticket');
  expect(green).not.toBe(blue);
  expect(await barFill('Dietary Preference')).toBe(blue);
  await section.getByRole('button', { name: 'Options for Ticket' }).click();
  await page.screenshot({ path: testInfo.outputPath('questions-menu.png') });
  await page.keyboard.press('Escape');
  await page.screenshot({ path: testInfo.outputPath('questions-small.png'), fullPage: true });

  const from = (await section.getByRole('button', { name: 'Reorder question Team Size' }).boundingBox())!;
  const to = (await section.getByRole('button', { name: 'Reorder question Ticket' }).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
  await page.mouse.up();
  await expect(titles).toHaveText(['Team Size', 'Ticket', 'Dietary Preference']);

  await pick('Team Size', 'Large');
  await page.reload();
  await expect(titles).toHaveText(['Team Size', 'Ticket', 'Dietary Preference'], { timeout: 60000 });
  expect(await widthOf('Team Size')).toBeGreaterThan(medium * 1.9);
  expect(await barFill('Ticket')).toBe(green);
  await page.screenshot({ path: testInfo.outputPath('questions-reordered.png'), fullPage: true });
  await context.close();
});
