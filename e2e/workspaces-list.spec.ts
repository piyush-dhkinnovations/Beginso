import { test, expect, type BrowserContext } from '@playwright/test';

/**
 * All workspaces: every card shows the workspace's own picture (or the BeginSo mark when it has none) beside its name, so a workspace is
 * recognisable here the way it is in the sidebar switcher. The backend is faked in the browser.
 */
const WORKSPACES = [
  { id: 'w1', name: 'Kala Chashma Entertainment', slug: 'kala', role: 'admin', isOwner: false, memberCount: 2, logo: '/avatars/05.svg' },
  { id: 'w2', name: 'Test', slug: 'test', role: 'owner', isOwner: true, memberCount: 1, logo: null },
  { id: 'w3', name: 'A very long workspace name that has to be cut off before it pushes the role badge out of its card', slug: 'long', role: 'member', isOwner: false, memberCount: 12, logo: null },
];

async function install(context: BrowserContext) {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  await context.route('**/api/backend/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === 'api/workspaces') return json({ success: true, workspaces: WORKSPACES, total: WORKSPACES.length });
    if (route.request().method() === 'GET' && /notifications|members|stages|tags|views|activity/.test(path)) return json([]);
    return json({});
  });
}

test.describe('All workspaces', () => {
  test('each card shows its logo, or the BeginSo mark, beside the name; the name and the role stay inside the card', async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await install(context);
    await page.goto('/workspaces');
    await expect(page.getByRole('heading', { name: 'Kala Chashma Entertainment' })).toBeVisible({ timeout: 60000 });

    const card = (name: string | RegExp) => page.getByRole('heading', { name }).locator('xpath=ancestor::a[1]');
    await expect(card('Kala Chashma Entertainment').locator('img')).toHaveAttribute('src', '/avatars/05.svg');
    await expect(card('Test').locator('img')).toHaveAttribute('src', '/favicon.svg');

    // the logo is level with the name, to its left, and a comfortable size
    const kala = card('Kala Chashma Entertainment');
    const logo = (await kala.locator('img').boundingBox())!;
    const title = (await kala.getByRole('heading').boundingBox())!;
    expect(logo.x + logo.width).toBeLessThanOrEqual(title.x + 1);
    expect(logo.width).toBeGreaterThanOrEqual(40);
    expect(Math.abs(logo.y - title.y)).toBeLessThan(logo.height);

    // a very long name is cut off inside its card, with the role badge still visible next to it
    const long = card(/^A very long workspace name/);
    const box = (await long.boundingBox())!;
    const badge = (await long.getByText('Editor').boundingBox())!;
    expect(badge.x + badge.width).toBeLessThanOrEqual(box.x + box.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('workspaces-1280.png') });
  });

  test('390px: one card per row, nothing cut off', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await install(context);
    await page.goto('/workspaces');
    await expect(page.getByRole('heading', { name: 'Test', exact: true })).toBeVisible({ timeout: 60000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    const logo = (await page.getByRole('heading', { name: 'Test', exact: true }).locator('xpath=ancestor::a[1]').locator('img').boundingBox())!;
    expect(logo.x).toBeGreaterThanOrEqual(0);
  });
});
