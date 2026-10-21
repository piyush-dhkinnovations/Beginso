import { test, expect } from '@playwright/test';

/**
 * QA A12-003: at tablet width the forms table was wider than its container, so the Updated column was cut off with no scroll cue.
 * Real browser, real layout: at 768px the table must fit (no horizontal scrolling inside its wrapper) and still show Updated.
 */
const form = (i: number) => ({
  _id: `f${i}`, workspaceId: null, title: `Customer feedback survey number ${i}`, description: '', status: i % 2 ? 'published' : 'draft', schemaVersion: 1,
  responseCount: i, contentVersion: 1, createdAt: '2026-10-10T10:00:00.000Z', updatedAt: '2026-10-16T17:42:00.000Z', pinned: false,
  createdBy: { _id: 'u1', name: 'Piyush Prajapat' }, pages: [], fields: [], branding: {}, settings: {},
});

for (const width of [768, 1024, 1440]) {
  test(`forms table fits its container at ${width}px and keeps the Updated column`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
    await context.route('**/api/backend/**', async (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api/backend/', '');
      const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
      if (path === 'api/forms') return json({ forms: [1, 2, 3, 4].map(form), total: 4, page: 1, limit: 10 });
      if (/workspaces|notifications|members|stages|tags/.test(path)) return json([]);
      return json({});
    });
    const page = await context.newPage();
    await page.goto('/forms');
    await expect(page.getByText('Customer feedback survey number 1', { exact: false }).first()).toBeVisible({ timeout: 60000 });
    const wrap = page.locator('.bg-table-wrap').first();
    const { scroll, client } = await wrap.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(scroll, 'table is wider than its container').toBeLessThanOrEqual(client);
    await expect(page.getByRole('columnheader', { name: /Updated/ })).toBeVisible();
    await context.close();
  });
}
