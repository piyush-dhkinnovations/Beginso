import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * The Responses calendar: a real month calendar (weekday headings, ruled grid, today picked out, stage-coloured chips), one control bar
 * (Today, previous / next, the month as a picker), and an empty month that is still a calendar. Runs in UTC so the days are exact.
 */
test.use({ timezoneId: 'UTC', locale: 'en-GB' });

const FORM_ID = 'e2e-calendar-form';
const STAGES = [
  { id: 'new', name: 'New', colour: 'info', category: 'new' },
  { id: 'review', name: 'In Review', colour: 'warning', category: 'in_progress' },
  { id: 'done', name: 'Released', colour: 'success', category: 'completed' },
];

const now = new Date();
const Y = now.getUTCFullYear();
const M = now.getUTCMonth();
const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: number) => `${Y}-${pad(M + 1)}-${pad(d)}`;
const at = (d: number, h: number) => new Date(Date.UTC(Y, M, d, h, 0, 0)).toISOString();
const monthWord = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(now);

// day 3: one, day 4: two (different stages), day 10: five (so "+2 more"); all in the current month
const SEED: { id: string; name: string; day: number; hour: number; stage: number }[] = [
  { id: 'r1', name: 'Asha Rao', day: 3, hour: 9, stage: 0 },
  { id: 'r2', name: 'Ben Das', day: 4, hour: 10, stage: 1 },
  { id: 'r3', name: 'Chitra Nair', day: 4, hour: 15, stage: 2 },
  ...[0, 1, 2, 3, 4].map((i) => ({ id: `m${i}`, name: `Person ${i + 1}`, day: 10, hour: 8 + i, stage: i % 3 })),
];

async function installBackend(context: BrowserContext) {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const toResponse = (s: (typeof SEED)[number]) => ({
    _id: s.id, formId: FORM_ID, reference: `#${s.id}`, answers: { 'Full name': s.name }, respondentEmail: `${s.id}@example.com`, assignee: null,
    tags: [], unread: false, noteCount: 0, duplicateOfId: null, status: 'new', stage: STAGES[s.stage],
    submittedAt: at(s.day, s.hour), createdAt: at(s.day, s.hour), updatedAt: at(s.day, s.hour),
  });
  const form = {
    _id: FORM_ID, workspaceId: null, title: 'Film submissions', description: '', status: 'published', schemaVersion: 1, responseCount: SEED.length,
    contentVersion: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    pages: [{ id: 'p1', order: 0, title: 'Page' }], branding: {}, settings: {},
    fields: [{ fieldId: 'Name', pageId: 'p1', label: 'Full name', type: 'short_text', required: false, deleted: false, order: 0 }],
  };
  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === `api/forms/${FORM_ID}`) return json(form);
    if (path === 'api/responses/stats') return json({ total: SEED.length, unread: 0 });
    const detail = path.match(/^api\/responses\/([^/]+)$/);
    if (detail && req.method() === 'GET') {
      const s = SEED.find((x) => x.id === detail[1]);
      return json({ success: true, response: { ...(s ? toResponse(s) : {}), response_files: [] } });
    }
    if (path === 'api/responses' && req.method() === 'GET') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const rows = SEED.map(toResponse).filter((r) => (!from || r.submittedAt >= from) && (!to || r.submittedAt <= to));
      return json({ success: true, data: rows, total: rows.length, page: 1, limit: 50, totalPages: 1 });
    }
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags|views|activity|notes|grants/.test(path)) return json([]);
    return json({});
  });
}

const grid = (page: Page) => page.getByRole('grid');
const cell = (page: Page, key: string) => page.getByRole('gridcell', { name: new RegExp(`^${key},`) });
async function openCalendar(page: Page) {
  await page.goto(`/forms/${FORM_ID}/inbox?view=calendar`);
  await expect(grid(page)).toBeVisible({ timeout: 60000 });
  await expect(cell(page, dayKey(3)).getByRole('button', { name: /Asha Rao/ })).toBeVisible({ timeout: 30000 });
}
const centreY = async (l: ReturnType<Page['locator']>) => {
  const b = (await l.boundingBox())!;
  return b.y + b.height / 2;
};
const NO_SCROLL = () => document.documentElement.scrollWidth <= window.innerWidth + 1;

test.describe('Responses calendar', () => {
  test('looks like a calendar: weekday headings, a ruled month, today picked out, coloured chips', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openCalendar(page);

    await expect(grid(page).getByRole('columnheader')).toHaveCount(7);
    const cells = await grid(page).getByRole('gridcell').count();
    expect(cells % 7).toBe(0);
    expect(cells).toBeGreaterThanOrEqual(28);

    const today = page.locator('[role=gridcell][aria-current=date]');
    await expect(today).toHaveCount(1);
    // the day number is a filled circle
    const circle = today.locator('span:not(.sr-only)').first();
    expect(await circle.evaluate((el) => getComputedStyle(el).borderRadius)).not.toBe('0px');

    // cells are rectangles that tile: same width, and 7 across
    const first = (await grid(page).getByRole('gridcell').nth(0).boundingBox())!;
    const second = (await grid(page).getByRole('gridcell').nth(1).boundingBox())!;
    expect(Math.abs(first.width - second.width)).toBeLessThan(2);
    expect(first.height).toBeGreaterThan(100);
    expect(second.x - (first.x + first.width)).toBeLessThanOrEqual(2); // a hairline between them, not a gap

    // chips: name and time, in the stage's colour, text readable
    const chip = cell(page, dayKey(4)).getByRole('button', { name: /Ben Das/ });
    await expect(chip).toContainText('10:00');
    await page.screenshot({ path: testInfo.outputPath('calendar-1440.png') });
    expect(await page.evaluate(NO_SCROLL)).toBe(true);
  });

  test('has no accessibility violations (colour contrast of the chips and the dimmed days included)', async ({ page, context }) => {
    await installBackend(context);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openCalendar(page);
    // axe-core is not a direct dependency (it ships inside eslint-plugin-jsx-a11y); it is injected from there.
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[]; failureSummary?: string }[] }[] }> } }).axe;
      const result = await axe.run({ include: [['[role=grid]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      return result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => `${n.target.join(' ')} :: ${n.failureSummary?.split('\n')[1] ?? ''}`).slice(0, 6) }));
    });
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  test('one control bar: Today, previous, next and the month on a single row, nothing else stacked above the grid', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCalendar(page);
    const ys = await Promise.all([
      centreY(page.getByRole('button', { name: 'Today' })),
      centreY(page.getByRole('button', { name: 'Previous month' })),
      centreY(page.getByRole('button', { name: 'Next month' })),
    ]);
    const monthBtn = page.getByRole('button', { name: new RegExp(`${monthWord} ${Y}`) });
    const title = (await monthBtn.boundingBox())!;
    for (const y of ys) expect(y).toBeGreaterThan(title.y - 12);
    expect(Math.abs(ys[0] - ys[1])).toBeLessThan(4);
    // no dropdown pair, no stage-filter row, no banner, no footer
    await expect(page.getByRole('combobox')).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Show stages' })).toHaveCount(0);
    await expect(page.getByText(/Times are shown in/)).toHaveCount(0);
    // the all-months total and the Date filter do not sit in the toolbar above a month view
    await expect(page.getByRole('button', { name: 'Date', exact: true })).toHaveCount(0);
    await expect(page.getByText(/^\d+ responses$/)).toHaveCount(0);
    // the bar sits directly above the grid
    const gridTop = (await grid(page).boundingBox())!.y;
    expect(gridTop - (title.y + title.height)).toBeLessThan(80);
    await page.screenshot({ path: testInfo.outputPath('calendar-bar.png'), clip: { x: 0, y: 0, width: 1440, height: 420 } });
  });

  test('a month with no responses is still a calendar, with a quiet note', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCalendar(page);
    await page.getByRole('button', { name: new RegExp(`${monthWord} ${Y}`) }).click();
    const picker = page.getByRole('dialog', { name: 'Choose a month' });
    await expect(picker).toBeVisible();
    await picker.screenshot({ path: testInfo.outputPath('month-picker.png') });
    await picker.getByRole('button', { name: 'Previous year' }).click();
    await picker.getByRole('button', { name: /^jan/i }).click();

    await expect(page.getByRole('heading', { name: new RegExp(`January ${Y - 1}`) })).toBeVisible();
    await expect(page.getByText('No responses this month')).toBeVisible();
    expect(await grid(page).getByRole('gridcell').count()).toBeGreaterThanOrEqual(28);
    await expect(page.getByText('No responses this month').locator('xpath=ancestor-or-self::*[@role="status"]')).toHaveCount(0); // not a banner row
    await page.screenshot({ path: testInfo.outputPath('calendar-empty.png') });

    await page.getByRole('button', { name: 'Today' }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`${monthWord} ${Y}`) })).toBeVisible();
    await expect(cell(page, dayKey(3)).getByRole('button', { name: /Asha Rao/ })).toBeVisible();
  });

  test('a day with more than three responses shows "+2 more", which opens that day\'s list', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCalendar(page);
    const busy = cell(page, dayKey(10));
    await expect(busy.getByRole('button', { name: /Person/ })).toHaveCount(3);
    await busy.getByRole('button', { name: /\+2/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Person/ })).toHaveCount(5);
    await dialog.screenshot({ path: testInfo.outputPath('day-list.png') });
  });

  test('a chip opens its response', async ({ page, context }) => {
    await installBackend(context);
    await openCalendar(page);
    await cell(page, dayKey(3)).getByRole('button', { name: /Asha Rao/ }).click();
    await expect(page).toHaveURL(/responseId=r1/);
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30000 });
  });

  test('keyboard: arrows move between days and Page Down keeps focus in the new month', async ({ page, context }) => {
    await installBackend(context);
    await openCalendar(page);
    const start = cell(page, dayKey(3));
    await start.focus();
    await page.keyboard.press('ArrowRight');
    await expect(cell(page, dayKey(4))).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(cell(page, dayKey(11))).toBeFocused();
    await page.keyboard.press('PageDown');
    const next = new Date(Date.UTC(Y, M + 1, 1));
    await expect(page.getByRole('heading', { name: new RegExp(`${new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(next)} ${next.getUTCFullYear()}`) })).toBeVisible();
    const focused = await page.evaluate(() => document.activeElement?.querySelector('.sr-only')?.textContent ?? '');
    expect(focused).toMatch(new RegExp(`^${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-11,`));
    await page.keyboard.press('PageUp');
    await expect(page.getByRole('heading', { name: new RegExp(`${monthWord} ${Y}`) })).toBeVisible();
  });

  test('390px: a plain agenda list instead of the grid, and nothing scrolls sideways', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`/forms/${FORM_ID}/inbox?view=calendar`);
    await expect(page.getByRole('list', { name: new RegExp(`${monthWord} ${Y} agenda`) })).toBeVisible({ timeout: 60000 });
    await expect(grid(page)).toBeHidden();
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
    expect(await page.evaluate(NO_SCROLL)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('calendar-390.png') });
  });

  test('Today, previous / next and the month sit in the filter bar after Show, not on a row of their own', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCalendar(page);
    const box = async (loc: ReturnType<Page['locator']>) => (await loc.first().boundingBox())!;
    const search = await box(page.getByLabel('Search responses'));
    const show = await box(page.getByRole('button', { name: /^Show/ }));
    const today = await box(page.getByRole('button', { name: 'Today' }));
    const month = await box(page.getByRole('heading', { name: new RegExp(`${monthWord} ${Y}`) }).or(page.getByRole('button', { name: new RegExp(`${monthWord} ${Y}`) })));
    const calendar = await box(page.getByRole('button', { name: 'Calendar', exact: true }).or(page.getByRole('radio', { name: 'Calendar' })));
    // Same row as Search and Show, to the right of Show, and to the left of the Table / Board / Calendar switcher.
    expect(Math.abs(today.y + today.height / 2 - (search.y + search.height / 2))).toBeLessThan(40);
    expect(today.x).toBeGreaterThan(show.x + show.width);
    expect(month.x).toBeGreaterThan(today.x);
    expect(month.x + month.width).toBeLessThan(calendar.x);
    await page.screenshot({ path: testInfo.outputPath('calendar-bar.png'), clip: { x: 0, y: 0, width: 1440, height: 320 } });
  });
});
