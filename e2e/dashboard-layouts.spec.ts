import { test, expect, type BrowserContext } from '@playwright/test';

/**
 * Customize > Layout: the four ready-made layouts line up (same card height, same sketch height), the window fits the screen, and choosing
 * one changes the dashboard at once as a draft. The backend is faked in the browser.
 */
async function install(context: BrowserContext) {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const form = (i: number) => ({
    _id: `f${i}`, workspaceId: null, title: `Form ${i}`, description: '', status: 'published', schemaVersion: 1, responseCount: i * 5,
    contentVersion: 1, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-20T00:00:00.000Z', pages: [], branding: {}, settings: {}, fields: [],
  });
  const points = Array.from({ length: 30 }, (_, i) => ({ bucketStart: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, responses: (i * 7) % 9 }));
  await context.route('**/api/backend/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'u1', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === 'api/workspaces') return json({ success: true, workspaces: [], total: 0 });
    if (path === 'api/dashboard/analytics') {
      return json({
        success: true,
        analytics: {
          totalForms: 3, publishedForms: 3, totalResponses: 30, responsesThisMonth: 9, recentActivity: [],
          locations: [{ country: 'India', region: null, city: 'Mumbai', lat: 19.07, lng: 72.87, count: 12 }, { country: 'India', region: null, city: 'Delhi', lat: 28.6, lng: 77.2, count: 8 }],
        },
      });
    }
    if (path === 'api/analytics/trends') return json({ success: true, dateRange: { bucket: 'day' }, points });
    if (path === 'api/forms') return json({ success: true, forms: [1, 2, 3].map(form), total: 3, page: 1, limit: 20, pages: 1, totalPages: 1 });
    if (route.request().method() === 'GET' && /notifications|members|stages|tags|views|activity|dashboards/.test(path)) return json([]);
    return json({});
  });
}

test('the layout window: four layouts that line up, fit the screen, and change the dashboard when chosen', async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await install(context);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Customize dashboard' }).click({ timeout: 60000 });
  await page.getByRole('button', { name: 'Choose a layout' }).click();

  const dialog = page.getByRole('dialog', { name: 'Choose a layout' });
  await expect(dialog).toBeVisible();
  const options = dialog.getByRole('button', { name: /^Use the .* layout$/ });
  await expect(options).toHaveCount(4);
  const spread = (list: ({ height: number } | null)[]) => Math.max(...list.map((b) => b!.height)) - Math.min(...list.map((b) => b!.height));
  // measured until it settles: the window fades in and the text can re-wrap while the font loads
  await expect(async () => {
    const boxes = await Promise.all([0, 1, 2, 3].map((i) => options.nth(i).boundingBox()));
    const sketches = await Promise.all([0, 1, 2, 3].map((i) => options.nth(i).locator('span[aria-hidden="true"]').first().boundingBox()));
    expect(spread(boxes), 'the four cards are the same height').toBeLessThan(1.5);
    expect(spread(sketches), 'the four sketches are the same height').toBeLessThan(1.5);
  }).toPass({ timeout: 5000 });
  // every block of every sketch is inside its frame (nothing is cut off at the bottom)
  for (let i = 0; i < 4; i += 1) {
    const inside = await options.nth(i).locator('span[aria-hidden="true"]').first().evaluate((frame) => {
      const f = frame.getBoundingClientRect();
      return [...frame.children].every((c) => c.getBoundingClientRect().bottom <= f.bottom - 4);
    });
    expect(inside, `sketch ${i + 1} fits its frame`).toBe(true);
  }
  const frame = (await dialog.boundingBox())!;
  expect(frame.y).toBeGreaterThanOrEqual(0);
  expect(frame.y + frame.height, 'the window fits the screen').toBeLessThanOrEqual(900);
  await page.screenshot({ path: testInfo.outputPath('layout-window.png') });

  await options.nth(2).click(); // Charts first
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('charts-first.png'), fullPage: true });
});
