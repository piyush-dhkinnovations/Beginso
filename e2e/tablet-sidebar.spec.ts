import { test, expect } from '@playwright/test';

/**
 * QA A3-008: at 768px the sidebar stayed fully expanded and took about 29% of the screen. Measured in a real browser at the widths
 * around the tablet range, on a normal app page (Notifications), with the sidebar width read from the rendered layout.
 */
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (p === 'api/auth/me') return json({ success: true, user: { id: 'u', name: 'E2E', email: 'e@e.com', onboardingCompleted: true } });
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags|forms/.test(p)) return json([]);
    return json({});
  });
});

const sidebarWidth = (page: import('@playwright/test').Page) =>
  page.evaluate(() => Math.round(document.querySelector('aside')?.getBoundingClientRect().width ?? -1));

for (const [width, expected] of [
  [768, 64],
  [900, 64],
  [1023, 64],
  [1024, 220],
  [1440, 220],
] as const) {
  test(`at ${width}px the sidebar is ${expected}px wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/notifications');
    await page.getByRole('heading', { name: 'Notifications' }).first().waitFor({ timeout: 60000 });
    await expect.poll(() => sidebarWidth(page)).toBe(expected);
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(noOverflow).toBe(true);
  });
}

test('on a tablet the menu button opens the full sidebar and closes it again', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/notifications');
  await page.getByRole('heading', { name: 'Notifications' }).first().waitFor({ timeout: 60000 });
  await expect.poll(() => sidebarWidth(page)).toBe(64);
  const menu = page.locator('header button').first();
  await menu.click();
  await expect.poll(() => sidebarWidth(page)).toBe(220);
  await menu.click();
  await expect.poll(() => sidebarWidth(page)).toBe(64);
});
