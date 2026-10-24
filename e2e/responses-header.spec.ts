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
    if (path === 'api/workspaces') return json({ success: true, workspaces: [{ id: '507f1f77bcf86cd799439011', slug: 'e2e-avatars-ws', name: 'E2E', role: 'admin', isOwner: false, memberCount: 2, timezone: 'UTC', logo: null }], total: 1 });
    if (path === 'api/workspaces/e2e-avatars-ws/stages') {
      const names = ['New', 'In Review', 'On Progress', 'On Hold', 'Released', 'Rejected'];
      return json({ success: true, stages: names.map((name, i) => ({ id: `st${i}`, name, colour: 'neutral', category: i === 0 ? 'new' : i < 4 ? 'in_progress' : 'completed', order: i, isDefault: i === 0 })) });
    }
    if (path === 'api/views' && req.method() === 'GET') {
      const view = (id: string, name: string, filters: object) => ({ id, name, ownerId: 'e2e-user', ownerName: 'E2E User', visibility: 'personal', formId: FORM_ID, filters, viewMode: 'table', createdAt: '2026-10-01T00:00:00.000Z' });
      return json({ success: true, views: [view('v1', 'test', { duplicate: true }), view('v2', 'fgdf', { unread: true })] });
    }
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
  // The search bar is on the switch's row; the stage pills and Table / Board / Calendar are on the row below.
  const pill = await box(page.getByRole('button', { name: /^All/ }));
  const search = await box(page.getByLabel('Search responses'));
  const tableTab = await box(page.getByRole('button', { name: 'Table', exact: true }));
  expect(search.y).toBeLessThan(pill.y);
  expect(Math.abs(tableTab.y + tableTab.height / 2 - (pill.y + pill.height / 2))).toBeLessThan(12);
  // The table (its first row) still starts high on a 900px screen.
  const row = await box(page.getByText('harsh.vora@example.com'));
  expect(row.y).toBeLessThan(420);
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

test('saved views: switching from one view to another replaces its filters, and the row does not move', async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await installBackend(context);
  await page.goto(`/forms/${FORM_ID}/inbox?ws=e2e-avatars-ws`);
  const picker = page.getByRole('button', { name: /^Saved views:/ });
  await expect(picker).toBeVisible({ timeout: 60000 });
  const before = (await picker.boundingBox())!;

  await picker.click();
  await page.getByRole('menuitem', { name: 'test', exact: true }).click();
  await expect(page).toHaveURL(/duplicate=1/);
  await expect(page.getByRole('button', { name: /^Saved views: test/ })).toBeVisible();
  // The manage button appears: it must not push the row up or down.
  const manage = page.getByRole('button', { name: /Manage the "test" saved view/ });
  await expect(manage).toBeVisible();
  const after = (await page.getByRole('button', { name: /^Saved views:/ }).boundingBox())!;
  expect(Math.abs(after.y - before.y), 'picker moved when the manage button appeared').toBeLessThan(6);
  expect(Math.abs((await manage.boundingBox())!.height - after.height)).toBeLessThan(1);
  await page.screenshot({ path: testInfo.outputPath('views-applied.png'), clip: { x: 700, y: 60, width: 740, height: 160 } });

  await page.getByRole('button', { name: /^Saved views:/ }).click();
  await page.screenshot({ path: testInfo.outputPath('views-menu.png'), clip: { x: 900, y: 60, width: 540, height: 340 } });
  await page.getByRole('menuitem', { name: 'fgdf', exact: true }).click();
  await expect(page).toHaveURL(/unread=1/);
  await expect(page).not.toHaveURL(/duplicate=1/);
  await expect(page.getByRole('button', { name: /^Saved views: fgdf/ })).toBeVisible();

  await page.getByRole('button', { name: /^Saved views:/ }).click();
  await page.getByRole('menuitem', { name: 'All responses' }).click();
  await expect(page).not.toHaveURL(/unread=1/);
  await expect(page.getByRole('button', { name: 'Saved views: All responses' })).toBeVisible();
});

test('on a narrower screen the stage tabs that do not fit go into More, and the picked one stays visible', async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 960, height: 800 });
  await installBackend(context);
  await page.goto(`/forms/${FORM_ID}/inbox?ws=e2e-avatars-ws`);
  const picker = page.getByRole('button', { name: /^Saved views:/ });
  await expect(picker).toBeVisible({ timeout: 60000 });
  const more = page.getByRole('button', { name: /^More filters/ });
  await expect(more).toBeVisible();
  // The saved-view picker is on the search line, and nothing makes the page scroll sideways.
  const search = (await page.getByLabel('Search responses').boundingBox())!;
  const pick = (await picker.boundingBox())!;
  expect(Math.abs(search.y + search.height / 2 - (pick.y + pick.height / 2))).toBeLessThan(60);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('responses-narrow.png'), clip: { x: 0, y: 0, width: 960, height: 330 } });

  await more.click();
  await page.getByRole('menuitem', { name: /^Rejected/ }).click();
  await expect(page.getByRole('button', { name: /^Rejected/, pressed: true })).toBeVisible();
});

test('searching: every letter typed stays in the box, the list is asked for once, and the page is not fetched again', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installBackend(context);
  const asked: string[] = [];
  const rsc: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.pathname.endsWith('/api/responses') && url.searchParams.get('q')) asked.push(url.searchParams.get('q')!);
    // (the sidebar's links prefetch their own pages in a production build: only the page being searched counts)
    if (url.searchParams.has('_rsc') && url.pathname.endsWith('/inbox')) rsc.push(url.pathname + url.search);
  });
  await page.goto(`/forms/${FORM_ID}/inbox`);
  await expect(page.getByText('harsh.vora@example.com').first()).toBeVisible({ timeout: 60000 });
  rsc.length = 0;

  const box = page.getByLabel('Search responses');
  // Typed at a person's pace, with a pause in the middle long enough for the first part to be sent while more is still being typed.
  await box.pressSequentially('hars', { delay: 90 });
  await page.waitForTimeout(400);
  await box.pressSequentially('h vora', { delay: 90 });
  await expect(box).toHaveValue('harsh vora');
  await expect(page).toHaveURL(/q=harsh\+vora|q=harsh%20vora/);
  await expect.poll(() => asked.at(-1)).toBe('harsh vora');
  // Nothing was lost to the address catching up, and the page itself was never asked for again.
  await page.waitForTimeout(500);
  await expect(box).toHaveValue('harsh vora');
  expect(rsc).toEqual([]);
  expect(asked.length).toBeLessThanOrEqual(3);
});

test('on a curved ultrawide screen the responses table spans the screen and every column is in view', async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 3440, height: 1440 });
  await installBackend(context);
  await page.goto(`/forms/${FORM_ID}/inbox`);
  await expect(page.getByText('harsh.vora@example.com').first()).toBeVisible({ timeout: 60000 });
  const table = (await page.getByRole('table').boundingBox())!;
  expect(table.width).toBeGreaterThan(3000);
  for (const name of ['Respondent', 'Email', 'Tags', 'Assignee', 'Stage', 'Submitted']) {
    const header = (await page.getByRole('columnheader', { name: new RegExp(name, 'i') }).first().boundingBox())!;
    expect(header.x + header.width, `${name} is inside the screen`).toBeLessThanOrEqual(3440);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('table-ultrawide.png') });
});

test('Export follows the selection: nothing chosen exports what the filters match, chosen rows export exactly those (PDF too)', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installBackend(context);
  const posts: { format?: string; ids?: string[]; formId?: string }[] = [];
  await context.route('**/api/backend/api/reports', async (route) => {
    if (route.request().method() === 'POST') {
      posts.push(route.request().postDataJSON());
      return route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ success: true, report: { id: 'rep1' } }) });
    }
    return route.fallback();
  });
  await page.goto(`/forms/${FORM_ID}/inbox?ws=e2e-avatars-ws`);
  await expect(page.getByText('harsh.vora@example.com').first()).toBeVisible({ timeout: 60000 });

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Spreadsheet (CSV)' }).click();
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0].ids).toBeUndefined();
  expect(posts[0].format).toBe('csv');

  // A selection starts from a row's actions menu; the second row is r1.
  await page.getByRole('button', { name: /^Actions for response from/ }).nth(1).click();
  await page.getByRole('menuitem', { name: 'Select' }).click();
  await page.getByRole('button', { name: 'Export 1 selected' }).click();
  await page.getByRole('menuitem', { name: 'PDF' }).click();
  await expect.poll(() => posts.length).toBe(2);
  expect(posts[1]).toMatchObject({ format: 'pdf', ids: ['r1'] });
});
