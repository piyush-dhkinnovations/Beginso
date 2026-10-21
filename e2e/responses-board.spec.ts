import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * The Responses board: stage columns that scroll on their own inside a board as tall as the screen, so the sideways scrollbar is
 * always in view, and a column that has more than a page loads the next one by itself when its end comes into view.
 * Personal scope, so the stages are the fixed defaults (New, In Progress, Completed). Names are invented.
 */
const FORM_ID = 'e2e-board-form';
const STAGES = [
  { id: 'new', name: 'New', colour: 'neutral', category: 'new' },
  { id: 'in_progress', name: 'In Progress', colour: 'warning', category: 'in_progress' },
  { id: 'completed', name: 'Completed', colour: 'success', category: 'completed' },
];
// A workspace with a long pipeline: nine lanes are far wider than any window.
const WIDE_STAGES = Array.from({ length: 9 }, (_, i) => ({ id: `w${i + 1}`, name: `Stage ${i + 1}`, colour: 'info', category: 'in_progress' }));
const PAGE = 20;
const COUNTS: Record<string, number> = { new: 45, in_progress: 3, completed: 0, w1: 45, w2: 30, w3: 8, w4: 3 };

async function installBackend(context: BrowserContext, opts: { wide?: boolean } = {}) {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const rowsOf = (stageId: string) =>
    Array.from({ length: COUNTS[stageId] ?? 0 }, (_, i) => {
      const id = `${stageId}-${i + 1}`;
      const stage = [...STAGES, ...WIDE_STAGES].find((s) => s.id === stageId)!;
      return {
        _id: id, formId: FORM_ID, reference: `#${id}`, answers: { 'Full name': `Person ${stageId} ${i + 1}` }, respondentEmail: `${id}@example.com`,
        assignee: null, tags: [], unread: i % 4 === 0, noteCount: 0, duplicateOfId: i % 7 === 3 ? 'x' : null, status: stageId, stage,
        submittedAt: '2026-10-04T10:00:00.000Z', createdAt: '2026-10-04T10:00:00.000Z', updatedAt: '2026-10-04T10:00:00.000Z',
      };
    });
  const form = {
    _id: FORM_ID, workspaceId: null, title: 'Film submissions', description: '', status: 'published', schemaVersion: 1, responseCount: 48,
    contentVersion: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    pages: [{ id: 'p1', order: 0, title: 'Page' }], branding: {}, settings: {},
    fields: [{ fieldId: 'Name', pageId: 'p1', label: 'Full name', type: 'short_text', required: false, deleted: false, order: 0 }],
  };
  const pages: number[] = [];
  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === `api/forms/${FORM_ID}`) return json(form);
    if (path === 'api/responses/stats') return json({ total: 48, unread: 0 });
    if (path === 'api/responses' && req.method() === 'GET') {
      const stageId = url.searchParams.get('stageId') ?? url.searchParams.get('status') ?? (opts.wide ? 'w1' : 'new');
      const page = Number(url.searchParams.get('page') ?? 1);
      if (stageId === 'new') pages.push(page);
      const all = rowsOf(stageId);
      return json({ success: true, data: all.slice((page - 1) * PAGE, page * PAGE), total: all.length, page, limit: PAGE, totalPages: Math.max(1, Math.ceil(all.length / PAGE)) });
    }
    if (opts.wide && path === 'api/workspaces') return json({ success: true, workspaces: [{ id: 'w1', slug: 'acme', name: 'Acme', role: 'admin', logo: null }], total: 1 });
    if (opts.wide && /^api\/workspaces\/acme\/stages$/.test(path)) return json({ success: true, stages: WIDE_STAGES });
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags|views|activity|notes|grants/.test(path)) return json([]);
    return json({});
  });
  return { pagesAsked: () => pages };
}

const column = (page: Page, name: string) => page.getByRole('listitem', { name: `${name} column` });
async function openBoard(page: Page) {
  await page.goto(`/forms/${FORM_ID}/inbox?view=board`);
  await expect(column(page, 'New')).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('button', { name: 'Open response from Person new 1', exact: true })).toBeVisible({ timeout: 30000 });
}
const NO_SCROLL = () => document.documentElement.scrollWidth <= window.innerWidth + 1;

test.describe('Responses board', () => {
  test('columns are tinted lanes with a count, and the empty one says so', async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installBackend(context);
    await openBoard(page);
    await expect(column(page, 'New').getByLabel('45 responses')).toBeVisible();
    await expect(column(page, 'In Progress').getByLabel('3 responses')).toBeVisible();
    await expect(column(page, 'Completed').getByText('No responses in Completed')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('board-1440.png') });
  });

  test('columns are as long as their cards: the page scrolls, not each column', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installBackend(context);
    await openBoard(page);
    const list = column(page, 'New').locator('.overflow-y-auto');
    await expect(list).toHaveCount(0);
    const m = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight }));
    expect(m.sh, 'the page is longer than the window, so it scrolls').toBeGreaterThan(m.ih);
  });

  test('the next page of a long column loads by itself as the page is scrolled, with no Load more button', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const fake = await installBackend(context);
    await openBoard(page);
    await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
    expect([...new Set(fake.pagesAsked())]).toEqual([1]);

    await page.mouse.move(700, 500);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.getByRole('button', { name: 'Open response from Person new 21', exact: true })).toBeAttached({ timeout: 15000 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.getByRole('button', { name: 'Open response from Person new 45', exact: true })).toBeAttached({ timeout: 15000 });
    expect([...new Set(fake.pagesAsked())]).toEqual([1, 2, 3]);
  });

  test('nine lanes: only the board scrolls sideways, the page, its header and the sidebar stay put', async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installBackend(context, { wide: true });
    await page.goto(`/forms/${FORM_ID}/inbox?view=board&ws=acme`);
    await expect(page.getByRole('listitem', { name: 'Stage 1 column' })).toBeVisible({ timeout: 60000 });
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    expect(m.sw, 'no sideways page scroll').toBeLessThanOrEqual(m.iw + 1);
    const board = page.getByRole('list', { name: 'Responses board' });
    expect(await board.evaluate((el) => el.scrollWidth > el.clientWidth), 'the board itself scrolls').toBe(true);
    // scrolled to the far lane and down the page: still the board that moved, never the page
    await board.evaluate((el) => el.scrollTo(el.scrollWidth, 0));
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const after = await page.evaluate(() => ({ x: window.scrollX, sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    expect(after.x, 'the page has not moved sideways').toBe(0);
    expect(after.sw).toBeLessThanOrEqual(after.iw + 1);
    // a real wheel over the board, down and to the right
    await page.mouse.move(700, 500);
    for (let i = 0; i < 12; i += 1) await page.mouse.wheel(400, 500);
    await page.waitForTimeout(500);
    const wheeled = await page.evaluate(() => ({ x: window.scrollX, sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    expect(wheeled.x, 'a wheel over the board does not slide the page sideways').toBe(0);
    await page.screenshot({ path: testInfo.outputPath('board-wide.png') });
  });

  test('390px: the board scrolls sideways inside itself and the page does not', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await installBackend(context);
    await openBoard(page);
    expect(await page.evaluate(NO_SCROLL)).toBe(true);
  });

  test('has no accessibility violations', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installBackend(context);
    await openBoard(page);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
      const result = await axe.run({ include: [['[aria-label="Responses board"]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      return result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target.join(' ')).slice(0, 4) }));
    });
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});
