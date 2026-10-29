import { test, expect, type Page } from '@playwright/test';

/**
 * The blocks of a page (the header, the filters, the list) are 16px apart on every page, the way the Forms page has them. Measured in a real
 * browser: the space between each block of the page and the next, on the Forms page and on the Responses page (the list of forms to pick from).
 */
const form = (i: number) => ({
  _id: `f${i}`, workspaceId: null, title: `Customer feedback survey number ${i}`, description: '', status: 'published', schemaVersion: 1,
  responseCount: i * 10, contentVersion: 1, createdAt: '2026-10-10T10:00:00.000Z', updatedAt: '2026-10-16T17:42:00.000Z', pinned: false,
  createdBy: { _id: 'u1', name: 'E2E User' }, pages: [], fields: [], branding: {}, settings: {},
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  await context.route('**/api/backend/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === 'api/forms') return json({ forms: [1, 2, 3].map(form), total: 3, page: 1, limit: 100 });
    if (/workspaces|notifications|members|stages|tags|views|activity/.test(path)) return json([]);
    return json({});
  });
});

/** The gaps, in pixels, between each block of the page (the children of the page's own root) and the one after it. */
const gaps = (page: Page) =>
  page.evaluate(() => {
    const root = document.querySelector('#main-content > div') as HTMLElement;
    const blocks = [...root.children].filter((el) => (el as HTMLElement).offsetHeight > 0) as HTMLElement[];
    return blocks.slice(1).map((el, i) => Math.round(el.getBoundingClientRect().top - blocks[i].getBoundingClientRect().bottom));
  });

for (const [name, path, ready] of [
  ['Forms', '/forms', 'Customer feedback survey number 1'],
  ['Responses', '/form-responses', 'Pick a form to read its responses'],
] as const) {
  test(`${name}: every block of the page is 16px from the next`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    await expect(page.getByText(ready, { exact: false }).first()).toBeVisible({ timeout: 60000 });
    const found = await gaps(page);
    expect(found.length, 'the page has several blocks').toBeGreaterThanOrEqual(2);
    expect(found, `gaps on ${name}`).toEqual(found.map(() => 16));
  });
}
