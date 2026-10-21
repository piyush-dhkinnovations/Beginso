import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * A form's Summary page: it opens on All time, remembers a narrower range the person chose (even after a visit to the Responses tab),
 * and Filters and Add chart share the form header's one row. Backend: a fake that lives in this file and records every overview
 * request, so the tests can see which date window the page actually asked for.
 */
const FORM_ID = 'e2e-summary-form';

interface Fake {
  overviewRequests: () => { from: string | null; to: string | null }[];
}

async function installBackend(context: BrowserContext): Promise<Fake> {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const overviewRequests: { from: string | null; to: string | null }[] = [];
  const form = {
    _id: FORM_ID, workspaceId: null, title: 'Kala Chasma Content Acquisition', description: '', status: 'published', schemaVersion: 1,
    responseCount: 42, contentVersion: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    pages: [{ id: 'p1', order: 0, title: 'Page' }], branding: {}, settings: {},
    fields: [{ fieldId: 'f1', pageId: 'p1', label: 'Name', type: 'short_text', required: false, deleted: false, order: 0 }],
  };

  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === `api/forms/${FORM_ID}`) return json(form);
    if (path === 'api/analytics/overview') {
      overviewRequests.push({ from: url.searchParams.get('from'), to: url.searchParams.get('to') });
      return json({ success: true, data: { total: 42, completed: 20, in_progress: 10, new: 12, completionRate: 60, views: 100 } });
    }
    if (path === 'api/analytics/trends') {
      return json({ success: true, points: [{ bucketStart: '2026-10-01T00:00:00.000Z', responses: 5 }, { bucketStart: '2026-10-08T00:00:00.000Z', responses: 9 }], dateRange: { bucket: 'week' } });
    }
    if (path === 'api/analytics/questions') return json({ success: true, data: { questions: [] } });
    if (path === `api/forms/${FORM_ID}/charts`) return json([]);
    if (path === 'api/responses' && req.method() === 'GET') return json({ success: true, data: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    if (path === 'api/responses/stats') return json({ total: 0, unread: 0 });
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags|views/.test(path)) return json([]);
    return json({});
  });
  return { overviewRequests: () => overviewRequests };
}

const trigger = (page: Page) => page.getByRole('button', { name: /^Filters/ });
const editForm = (page: Page) => page.getByRole('link', { name: 'Edit form' });
const addChart = (page: Page) => page.getByRole('button', { name: 'Add chart' });
const modeSwitch = (page: Page) => page.getByRole('group', { name: 'Form data view' });
const openSummary = async (page: Page) => {
  await page.goto(`/forms/${FORM_ID}/insights`);
  await expect(trigger(page)).toBeVisible({ timeout: 60000 });
  await expect(addChart(page)).toBeVisible();
};
const NO_SCROLL = () => document.documentElement.scrollWidth <= window.innerWidth + 1;
const centreY = async (l: ReturnType<Page['locator']>) => {
  const b = (await l.boundingBox())!;
  return b.y + b.height / 2;
};

test.describe('Summary page header and filters', () => {
  test('opens on All time, and the first request asks for no date window', async ({ page, context }) => {
    const fake = await installBackend(context);
    await openSummary(page);
    await expect(trigger(page)).toContainText('All time');
    await expect.poll(() => fake.overviewRequests().length).toBeGreaterThan(0);
    expect(fake.overviewRequests()[0]).toEqual({ from: null, to: null });
  });

  test('Filters, Add chart, Summary / Responses and Edit form are one row (no second row of buttons)', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openSummary(page);
    const ys = await Promise.all([centreY(trigger(page)), centreY(addChart(page)), centreY(editForm(page)), centreY(modeSwitch(page))]);
    for (const y of ys) expect(Math.abs(y - ys[0])).toBeLessThan(4);
    // the same height as the neighbouring buttons, not a taller or a smaller one
    const [filters, add, edit] = await Promise.all([trigger(page).boundingBox(), addChart(page).boundingBox(), editForm(page).boundingBox()]);
    expect(Math.abs(filters!.height - edit!.height)).toBeLessThan(3);
    expect(Math.abs(add!.height - edit!.height)).toBeLessThan(3);
    await page.locator('main').first().screenshot({ path: testInfo.outputPath('summary-header-1440.png'), clip: { x: 0, y: 0, width: 1200, height: 260 } }).catch(() => undefined);
    await page.screenshot({ path: testInfo.outputPath('summary-1440.png') });
  });

  for (const width of [1440, 1024, 768, 560, 390]) {
    test(`${width}px: the Filters button stays on one line, whole, and the page does not scroll sideways`, async ({ page, context }, testInfo) => {
      await installBackend(context);
      await page.setViewportSize({ width, height: 900 });
      await openSummary(page);

      const button = (await trigger(page).boundingBox())!;
      const edit = (await editForm(page).boundingBox())!;
      expect(Math.abs(button.height - edit.height), 'same height as Edit form').toBeLessThan(3);
      expect(button.height).toBeLessThan(48);
      // icon, label, range and arrow all on one line: nothing wrapped under anything else
      const parts = await trigger(page).evaluate((el) => [...el.children, ...[...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent?.trim())].map((n) => {
        const r = document.createRange();
        r.selectNodeContents(n);
        const b = r.getBoundingClientRect();
        return b.top + b.height / 2;
      }));
      for (const y of parts) expect(Math.abs(y - parts[0])).toBeLessThan(5);
      // fully on screen
      expect(button.x).toBeGreaterThanOrEqual(0);
      expect(button.x + button.width).toBeLessThanOrEqual(width + 1);
      expect(await page.evaluate(NO_SCROLL)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`summary-${width}.png`) });
    });
  }

  test('the filter panel is compact: small chips, a narrow panel, no oversized buttons', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openSummary(page);
    await trigger(page).click();
    const dialog = page.getByRole('dialog', { name: 'Analytics filters' });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(381);
    for (const name of ['Last 7 days', 'Last 30 days', 'Last 90 days', 'All time']) {
      const chip = (await dialog.getByRole('button', { name }).boundingBox())!;
      expect(chip.height, name).toBeLessThanOrEqual(34);
    }
    await dialog.screenshot({ path: testInfo.outputPath('filters-panel.png') });
  });

  test('a chosen range is still there after going to Responses and coming back', async ({ page, context }) => {
    const fake = await installBackend(context);
    await openSummary(page);
    await trigger(page).click();
    await page.getByRole('dialog', { name: 'Analytics filters' }).getByRole('button', { name: 'Last 30 days' }).click();
    await expect(trigger(page)).toContainText('Last 30 days');
    await expect(page).toHaveURL(/from=.*&to=/);

    await modeSwitch(page).getByRole('button', { name: 'Responses' }).click();
    await expect(page).toHaveURL(/\/forms\/.*\/inbox/);
    await expect(page).not.toHaveURL(/from=/); // the Responses page has no date window of its own

    const before = fake.overviewRequests().length;
    await modeSwitch(page).getByRole('button', { name: 'Summary' }).click();
    await expect(trigger(page)).toContainText('Last 30 days', { timeout: 30000 });
    await expect(page).toHaveURL(/from=.*&to=/); // put back in the URL
    await page.waitForTimeout(500);
    // Coming back never asks for All time first (the cached 30-day data may be reused, so there may be no new request at all).
    const after = fake.overviewRequests().slice(before);
    expect(after.every((r) => r.from !== null && r.to !== null)).toBe(true);
  });

  test('also after a full reload and in a new tab', async ({ page, context }) => {
    await installBackend(context);
    await openSummary(page);
    await trigger(page).click();
    await page.getByRole('dialog', { name: 'Analytics filters' }).getByRole('button', { name: 'Last 7 days' }).click();
    await expect(trigger(page)).toContainText('Last 7 days');

    const second = await context.newPage();
    await second.goto(`/forms/${FORM_ID}/insights`);
    await expect(trigger(second)).toContainText('Last 7 days', { timeout: 60000 });
    await page.goto(`/forms/${FORM_ID}/insights`);
    await expect(trigger(page)).toContainText('Last 7 days', { timeout: 60000 });
  });

  test('choosing All time again is remembered as well', async ({ page, context }) => {
    await installBackend(context);
    await openSummary(page);
    await trigger(page).click();
    await page.getByRole('dialog', { name: 'Analytics filters' }).getByRole('button', { name: 'Last 90 days' }).click();
    await page.getByRole('dialog', { name: 'Analytics filters' }).getByRole('button', { name: 'All time' }).click();
    await expect(trigger(page)).toContainText('All time');
    await page.goto(`/forms/${FORM_ID}/insights`);
    await expect(trigger(page)).toContainText('All time', { timeout: 60000 });
  });
});
