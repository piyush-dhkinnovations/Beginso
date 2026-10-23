import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * A form's Responses page header is compact: the status badge sits on the title's line and Export sits beside Edit form, so the
 * list starts higher. The backend is faked in the browser.
 */
const FORM_ID = 'e2e-avatar-form';
const PEOPLE = ['harsh.vora@example.com', 'gerald.gray@example.com', 'ratin.mehta@example.com', 'afzal.shaikh@example.com', 'jayesh.patel@example.com', 'piyush.prajapat@example.com', 'vinod.umrao@example.com', 'mukul.gupta@example.com'];

async function installBackend(context: BrowserContext) {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const rows = PEOPLE.map((email, i) => ({
    _id: `r${i}`, formId: FORM_ID, reference: `#${i + 1}`, answers: {}, respondentEmail: email, assignee: null, tags: [], unread: i % 2 === 0,
    stage: { id: 'new', name: 'New', colour: 'neutral', category: 'new' },
    submittedAt: '2026-10-16T10:00:00.000Z', createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z',
  }));
  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === 'api/responses' && req.method() === 'GET') return json({ success: true, data: rows, total: rows.length, page: 1, limit: 50, totalPages: 1 });
    if (path === 'api/responses/stats') return json({ total: rows.length, unread: 4 });
    if (path === `api/forms/${FORM_ID}`) return json({ _id: FORM_ID, title: 'Avatar form', fields: [], pages: [], status: 'published', workspaceId: null });
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags|views/.test(path)) return json([]);
    return json({});
  });
}


test('the status badge is on the title line and Export is in the header row beside Edit form', async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installBackend(context);
  await page.goto(`/forms/${FORM_ID}/inbox`);
  await expect(page.getByText('harsh.vora@example.com').first()).toBeVisible({ timeout: 60000 });
  const box = async (loc: ReturnType<Page['locator']>) => (await loc.first().boundingBox())!;
  const title = await box(page.getByRole('heading', { name: 'Avatar form', level: 1 }));
  const badge = await box(page.getByText('Published', { exact: true }));
  const edit = await box(page.getByRole('link', { name: 'Edit form' }));
  const exportBtn = await box(page.getByRole('button', { name: 'Export', exact: true }));
  // Same line as the title (centres within a few px), not under it.
  expect(Math.abs(badge.y + badge.height / 2 - (title.y + title.height / 2))).toBeLessThan(12);
  // Export is level with Edit form, to its left.
  expect(Math.abs(exportBtn.y - edit.y)).toBeLessThan(8);
  expect(exportBtn.x).toBeLessThan(edit.x);
  // The stage tabs sit on a rule, directly under the title row, and the search bar follows on one line with the layout switcher.
  const tab = await box(page.getByRole('button', { name: /^All/ }));
  const search = await box(page.getByLabel('Search responses'));
  const tableTab = await box(page.getByRole('radio', { name: 'Table' }).or(page.getByRole('button', { name: 'Table' })));
  expect(tab.y).toBeGreaterThan(title.y);
  expect(Math.abs(search.y + search.height / 2 - (tableTab.y + tableTab.height / 2))).toBeLessThan(14);
  // The table (its first row) starts high on a 900px screen.
  const row = await box(page.getByText('harsh.vora@example.com'));
  expect(row.y).toBeLessThan(330);
  await page.screenshot({ path: testInfo.outputPath('responses-header.png'), clip: { x: 0, y: 0, width: 1440, height: 340 } });
});

test('an active filter is a chip in the search bar, and the stage is not repeated as a chip', async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installBackend(context);
  await page.goto(`/forms/${FORM_ID}/inbox?duplicate=1&unread=1`);
  await expect(page.getByText('harsh.vora@example.com').first()).toBeVisible({ timeout: 60000 });
  const chip = page.getByRole('button', { name: 'Remove filter: Duplicates only' });
  await expect(chip).toBeVisible();
  // "Unread only" is the Unread tab, so no chip repeats it.
  await expect(page.getByText('Unread only')).toHaveCount(0);
  const search = (await page.getByLabel('Search responses').boundingBox())!;
  const c = (await chip.boundingBox())!;
  expect(Math.abs(c.y + c.height / 2 - (search.y + search.height / 2))).toBeLessThan(16);
  await page.screenshot({ path: testInfo.outputPath('responses-filtered.png'), clip: { x: 0, y: 0, width: 1440, height: 340 } });
});
