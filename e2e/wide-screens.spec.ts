import { test, expect, type BrowserContext } from '@playwright/test';

/**
 * The page uses the screen it is given. The content pane is capped at 2400px up to a 2560px screen and 3600px beyond, so a 1920 monitor, a 2K screen and a curved ultrawide are filled (32px of padding, no margin), and a super-ultrawide still
 * gets a bounded column. The
 * backend is faked in the browser.
 */
async function install(context: BrowserContext) {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const form = (i: number) => ({
    _id: `f${i}`, workspaceId: null, title: `Form ${i}`, description: '', status: 'published', schemaVersion: 1, responseCount: i, contentVersion: 1,
    createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-20T00:00:00.000Z', pages: [], branding: {}, settings: {}, fields: [],
  });
  await context.route('**/api/backend/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'u1', name: 'Piyush Prajapat', email: 'p@example.com', onboardingCompleted: true } });
    // The workspace the mock server (which the app asks while rendering a /w page) knows about.
    const ws = { id: '507f1f77bcf86cd799439011', slug: 'e2e-avatars-ws', name: 'Kala Chashma Entertainment', role: 'admin', isOwner: false, memberCount: 2, timezone: 'UTC', logo: null };
    if (path === 'api/workspaces') return json({ success: true, workspaces: [ws], total: 1 });
    if (path === `api/workspaces/${ws.slug}` || path === `api/workspaces/${ws.id}`) return json({ success: true, workspace: ws });
    if (path === 'api/dashboard/analytics' || path === `api/workspaces/${ws.slug}/analytics`) {
      return json({ success: true, totalForms: 3, publishedForms: 3, totalResponses: 28, responsesThisMonth: 9, recentActivity: [] });
    }
    if (path === 'api/forms') {
      const rows = [1, 2, 3].map(form);
      return json({ success: true, forms: rows, total: rows.length, page: 1, limit: 20, pages: 1, totalPages: 1 });
    }
    if (route.request().method() === 'GET' && /notifications|members|stages|tags|views|activity|dashboards/.test(path)) return json([]);
    return json({});
  });
}


const SIZES = [
  { width: 1280, height: 800, main: [1000, 1100], pad: 32 },
  { width: 1440, height: 900, main: [1200, 1220], pad: 32 },
  { width: 1900, height: 1000, main: [1670, 1685], pad: 32 },
  { width: 1920, height: 1080, main: [1680, 1700], pad: 32 },
  { width: 2560, height: 1440, main: [2320, 2340], pad: 32 },
  { width: 3440, height: 1440, main: [3200, 3230], pad: 32 },
  { width: 5120, height: 1440, main: [3600, 3600], pad: 32 },
];

for (const size of SIZES) {
  test(`${size.width}px wide: the content pane is ${size.main[0]}-${size.main[1]}px with ${size.pad}px padding, and nothing scrolls sideways`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await install(context);
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'Customize dashboard' })).toBeVisible({ timeout: 60000 });
    const main = (await page.locator('#main-content').boundingBox())!;
    expect(main.width).toBeGreaterThanOrEqual(size.main[0]);
    expect(main.width).toBeLessThanOrEqual(size.main[1]);
    // the pane touches the sidebar and the screen edge: no centring margin on either side
    const margin = await page.locator('#main-content').evaluate((el) => parseFloat(getComputedStyle(el).marginLeft));
    if (size.width <= 2560) expect(margin).toBe(0);
    const padding = await page.locator('#main-content').evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));
    expect(padding).toBe(size.pad);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (size.width === 2560) await page.screenshot({ path: testInfo.outputPath('home-2k.png') });
  });
}

test('2560px wide: the card pages put four cards in a row', async ({ page, context }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await install(context);
  await page.goto('/workspaces');
  const cards = page.locator('main .grid', { has: page.locator('a[href^="/w/"]') }).first();
  await expect(cards).toBeVisible({ timeout: 60000 });
  const columns = await cards.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns).toBeGreaterThanOrEqual(4);
});
