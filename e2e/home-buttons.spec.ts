import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * The buttons in the header of both Home pages (personal and workspace) are the same size: Customize used to be a small button beside
 * full-size Create Form and Templates buttons. The backend is faked in the browser.
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

async function heights(page: Page, names: (string | RegExp)[]) {
  const out: number[] = [];
  for (const name of names) {
    const box = (await page.getByRole('button', { name }).or(page.getByRole('link', { name })).first().boundingBox())!;
    out.push(Math.round(box.height));
  }
  return out;
}

test.describe('Home header buttons', () => {
  test('personal Home: Customize and Create Form are the same height', async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await install(context);
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'Customize dashboard' })).toBeVisible({ timeout: 60000 });
    const [customize, create] = await heights(page, ['Customize dashboard', 'Create Form']);
    expect(customize, 'Customize and Create Form').toBe(create);
    await page.screenshot({ path: testInfo.outputPath('home-personal.png'), clip: { x: 700, y: 60, width: 740, height: 90 } });
  });

  test('workspace Home: Customize and Create Form are the same height, and there is no Templates button beside them', async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await install(context);
    await page.goto('/w/e2e-avatars-ws');
    await expect(page.getByRole('button', { name: 'Customize dashboard' })).toBeVisible({ timeout: 60000 });
    const [customize, create] = await heights(page, ['Customize dashboard', 'Create Form']);
    expect(customize, 'Customize and Create Form').toBe(create);
    // Templates is a Quick action further down the page, not a header button
    const header = page.getByRole('heading', { name: /^Welcome back/ }).locator('xpath=ancestor::*[.//button[@aria-label="Customize dashboard"]][1]');
    await expect(header.getByRole('link', { name: 'Templates' })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('home-workspace.png'), clip: { x: 700, y: 60, width: 740, height: 90 } });
  });

  test('while customizing, Add widget, Cancel and Save are one size as well', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await install(context);
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Customize dashboard' }).click({ timeout: 60000 });
    const [add, cancel, save] = await heights(page, ['Add widget', 'Cancel', 'Save']);
    expect(cancel).toBe(add);
    expect(save).toBe(add);
  });
});
