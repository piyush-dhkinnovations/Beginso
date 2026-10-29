import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * The chart builder, end to end in the browser with the backend faked (it answers like the real one: a chart query returns its groups,
 * the Responses list honours the `chart` filter with the same numbers). Covers: Next, Next, Save with nothing filled in; filters with a
 * group; clicking a part opens the responses in the side screen and "Open in Responses" lands on the same count; edit, duplicate,
 * reorder, remove; the page never scrolls sideways at 360 / 768 / 1440 and axe is clean.
 */
const FORM_ID = 'e2e-chart-form';
const FIELDS = [
  { fieldId: 'f-name', pageId: 'p1', label: 'Name', type: 'short_text', required: false, deleted: false, order: 0 },
  { fieldId: 'f-plan', pageId: 'p1', label: 'Plan', type: 'dropdown', required: false, deleted: false, order: 1, options: ['Free', 'Pro', 'Team'] },
  { fieldId: 'f-age', pageId: 'p1', label: 'Age', type: 'number', required: false, deleted: false, order: 2 },
  { fieldId: 'f-when', pageId: 'p1', label: 'Start date', type: 'date', required: false, deleted: false, order: 3 },
];
const AGE = [
  { key: '18', label: '18–27', n: 10 },
  { key: '28', label: '28–37', n: 6 },
  { key: '38', label: '38–47', n: 4 },
];
const PLAN = [
  { key: 'Pro', label: 'Pro', n: 20 },
  { key: 'Free', label: 'Free', n: 12 },
  { key: 'Team', label: 'Team', n: 8 },
];

interface Fake {
  queries: () => any[];
  paths: () => any[][];
  created: () => any[];
  patched: () => any[];
  deleted: () => string[];
  orders: () => string[][];
  duplicated: () => string[];
}

const chartRow = (id: string, position: number, title: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  formId: FORM_ID,
  fieldId: 'f-plan',
  kind: 'simple',
  version: 1,
  chartType: 'auto',
  size: 'medium',
  title,
  visibility: 'private',
  ownerId: 'e2e-user',
  isOwner: true,
  canEdit: true,
  position,
  order: position,
  options: { valueMode: 'count', legend: true, sort: 'order' },
  definition: { kind: 'simple', measure: { type: 'count' }, groupBy: { field: { kind: 'question', fieldId: 'f-plan' } }, display: { values: 'counts', legend: true, dataLabels: false, palette: 'theme', interactive: true } },
  ...extra,
});

async function installBackend(context: BrowserContext, seed: any[] = []): Promise<Fake> {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const queries: any[] = [];
  const paths: any[][] = [];
  const created: any[] = [];
  const patched: any[] = [];
  const deleted: string[] = [];
  const orders: string[][] = [];
  const duplicated: string[] = [];
  let store = [...seed];
  let n = 100;

  const form = {
    _id: FORM_ID, workspaceId: null, title: 'Customer service', description: '', status: 'published', schemaVersion: 1, responseCount: 40, contentVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', pages: [{ id: 'p1', order: 0, title: 'Page' }], branding: {}, settings: {}, fields: FIELDS,
  };
  const result = (def: any, path: any[] = []) => {
    const filtered = !!def.filters;
    const drill = def.kind === 'drilldown';
    const depth = path.length;
    const f = drill ? def.levels[depth].field : def.groupBy.field;
    const isAge = f.kind === 'question' && f.fieldId === 'f-age';
    const parent = depth > 0 ? (PLAN.find((p) => p.key === path[0].key)?.n ?? 0) : 40;
    const entries = isAge
      ? AGE.map((a) => ({ key: a.key, label: a.label, value: a.n, n: a.n, share: a.n / 20, focus: { key: a.key, lo: Number(a.key), hi: Number(a.key) + 10 } }))
      : f.kind === 'question' && f.fieldId === 'f-plan'
        ? PLAN.map((p) => ({ ...p, value: filtered ? Math.ceil(p.n / 2) : p.n, n: filtered ? Math.ceil(p.n / 2) : p.n, share: p.n / 40, focus: { key: p.key } }))
        : ['2026-08', '2026-09', '2026-10'].map((k, i) => ({ key: k, label: ['Aug 2026', 'Sep 2026', 'Oct 2026'][i], value: 10 + i, n: 10 + i, share: 0.25, focus: { key: k } }));
    const next = drill && depth + 1 < def.levels.length ? def.levels[depth + 1].field : null;
    return {
      depth,
      levelCount: drill ? def.levels.length : 1,
      nextLevel: next ? { field: next, label: next.kind === 'question' && next.fieldId === 'f-age' ? 'Age' : 'Plan' } : null,
      level: { field: f, label: isAge ? 'Age' : f.kind === 'question' ? 'Plan' : 'Submitted', kind: isAge ? 'number' : f.kind === 'question' ? 'choice' : 'time', ...(f.kind === 'system' ? { bucket: 'month' } : {}) },
      fieldType: isAge ? 'number' : f.kind === 'question' ? 'dropdown' : 'submittedAt',
      optionCount: isAge ? null : f.kind === 'question' ? 3 : null,
      measure: { type: def.measure.type, label: 'Responses' },
      total: filtered ? 20 : parent, answered: filtered ? 20 : parent, blank: 0, blankLabel: "didn't answer", measureAnswered: null,
      entries, shown: entries.length, totalGroups: entries.length, warnings: [], computedAt: new Date().toISOString(),
    };
  };

  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/backend/', '');
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const base = `api/forms/${FORM_ID}/charts`;

    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === `api/forms/${FORM_ID}`) return json(form);
    if (path === 'api/analytics/overview') return json({ success: true, data: { total: 40, completed: 20, in_progress: 10, new: 10, completionRate: 50, views: 100 } });
    if (path === 'api/analytics/trends') return json({ success: true, points: [], dateRange: { bucket: 'week' } });
    if (path === 'api/analytics/questions') return json({ success: true, data: { questions: [] } });
    if (path === base && req.method() === 'GET') return json({ success: true, charts: store });
    if (path === base && req.method() === 'POST') {
      const body = req.postDataJSON();
      created.push(body);
      const chart = chartRow(`c${(n += 1)}`, store.length, body.title, { chartType: body.chartType, size: body.size, visibility: body.visibility, definition: body.definition, kind: body.definition.kind, fieldId: 'f-plan' });
      store = [...store, chart];
      return json({ success: true, chart }, 201);
    }
    if (path === `${base}/query`) {
      const body = req.postDataJSON();
      queries.push(body.definition);
      paths.push(body.path ?? []);
      return json({ success: true, ...result(body.definition, body.path ?? []) });
    }
    if (path === `${base}/order` && req.method() === 'PUT') {
      const { ids } = req.postDataJSON();
      orders.push(ids);
      store = ids.map((id: string, i: number) => ({ ...store.find((c) => c._id === id), position: i }));
      return json({ success: true, charts: store });
    }
    const one = path.match(new RegExp(`^${base}/([^/]+)(/data|/duplicate)?$`));
    if (one) {
      const id = one[1];
      const chart = store.find((c) => c._id === id);
      if (one[2] === '/data') return json({ success: true, fieldMissing: false, query: result(chart.definition) });
      if (one[2] === '/duplicate') {
        duplicated.push(id);
        const copy = chartRow(`c${(n += 1)}`, store.length, `${chart.title} (copy)`, { definition: chart.definition });
        store = [...store, copy];
        return json({ success: true, chart: copy }, 201);
      }
      if (req.method() === 'PATCH') {
        const body = req.postDataJSON();
        patched.push({ id, ...body });
        store = store.map((c) => (c._id === id ? { ...c, ...body, version: c.version + 1, chartType: body.chartType ?? c.chartType } : c));
        return json({ success: true, chart: store.find((c) => c._id === id) });
      }
      if (req.method() === 'DELETE') {
        deleted.push(id);
        store = store.filter((c) => c._id !== id);
        return json({ success: true });
      }
    }
    if (path === 'api/responses' && req.method() === 'GET') {
      const chart = url.searchParams.get('chart');
      const parsed = chart ? JSON.parse(chart) : {};
      const key = parsed.focus?.key;
      const deep = (parsed.path ?? []).length > 0;
      // a drill-down: the parts clicked narrow it, so the same group name counts differently one level down
      const total = deep ? (key ? (AGE.find((a) => a.key === key)?.n ?? 0) : (PLAN.find((p) => p.key === parsed.path[0].key)?.n ?? 0)) : key ? (PLAN.find((p) => p.key === key)?.n ?? 0) : 40;
      const limit = Number(url.searchParams.get('limit') ?? 50);
      const rows = Array.from({ length: Math.min(total, limit) }, (_, i) => ({
        _id: `r${i}`, formId: FORM_ID, reference: `CUSTOM${String(i + 1).padStart(4, '0')}`, answers: { Name: `Person ${i + 1}`, Plan: key ?? 'Pro' }, respondentEmail: `person${i + 1}@example.com`,
        tags: [], unread: false, assignee: null, stage: { id: 'new', name: 'New', colour: 'neutral', category: 'new' },
        submittedAt: '2026-10-16T10:00:00.000Z', createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z',
      }));
      return json({ success: true, data: rows, total, page: 1, limit, totalPages: Math.ceil(total / limit) });
    }
    if (path === 'api/responses/stats') return json({ total: 40, unread: 0, byCategory: { new: 40, in_progress: 0, completed: 0 }, byStage: [] });
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags|views|activity|response-setup/.test(path)) return json([]);
    return json({});
  });
  return { queries: () => queries, paths: () => paths, created: () => created, patched: () => patched, deleted: () => deleted, orders: () => orders, duplicated: () => duplicated };
}

const openInsights = async (page: Page, width = 1440) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/forms/${FORM_ID}/insights`);
  await expect(page.getByRole('button', { name: 'Add chart' }).first()).toBeVisible({ timeout: 60000 });
};
const NO_SCROLL = () => document.documentElement.scrollWidth <= window.innerWidth + 1;
// A card's menu: the list behind it can refresh right after a change (a copy arrives), which closes a menu that was just opened, so open it
// again until it stays.
const openCardMenu = async (page: Page, title: string) => {
  const trigger = page.getByRole('button', { name: `Chart options for ${title}`, exact: true });
  await expect(async () => {
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
    await expect(page.getByRole('menuitem').first()).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15000 });
};
const next = (page: Page) => page.getByRole('button', { name: 'Next' });
const toDrillBasics = async (page: Page) => {
  await page.getByRole('button', { name: 'Add chart' }).first().click();
  await expect(page.getByRole('heading', { name: 'What kind of chart?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).nth(1).click();
  await expect(page.getByLabel('Chart title')).toBeVisible();
};
const toBasics = async (page: Page) => {
  await page.getByRole('button', { name: 'Add chart' }).first().click();
  await expect(page.getByRole('heading', { name: 'What kind of chart?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).first().click();
  await expect(page.getByLabel('Chart title')).toBeVisible();
};

test.describe('Chart builder', () => {
  test('Next, Next, Save to dashboard gives a good chart; clicking a bar opens the responses in the side screen, and Open in Responses lands on the same count', async ({ page, context }, testInfo) => {
    const fake = await installBackend(context);
    await openInsights(page);
    await toBasics(page);
    await expect(page.getByLabel('Chart title')).toHaveValue('Responses by Plan');
    await expect(page.getByRole('heading', { name: 'Basic information' })).toBeFocused();
    await expect(page.getByText('42 responses')).toHaveCount(0);
    await expect(page.getByText(/40 responses/).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('wizard-basics.png') });
    await next(page).click();
    await expect(page.getByRole('heading', { name: 'Configure chart' })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('wizard-configure.png') });
    await next(page).click();
    await expect(page.getByRole('heading', { name: 'Preview & save' })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('wizard-save.png') });
    await page.getByRole('button', { name: 'Save to dashboard' }).click();

    await expect(page).toHaveURL(/\/insights$/);
    expect(fake.created()).toHaveLength(1);
    expect(fake.created()[0]).toMatchObject({ title: 'Responses by Plan', chartType: 'auto', size: 'medium', visibility: 'private', definition: { kind: 'simple', measure: { type: 'count' } } });
    const card = page.getByLabel('Responses by Plan', { exact: true });
    await expect(card).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('dashboard.png') });

    // a part of the chart opens the responses in the side screen with the same number. A slice moves under the pointer (it grows on hover), so
    // this goes through the table every chart has underneath it, which is also the way for anyone who cannot use the picture.
    await card.getByRole('button', { name: 'Show as a table' }).click();
    await card.getByRole('button', { name: 'See responses: Pro' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByRole('heading', { name: 'Pro - 20 responses' })).toBeVisible();
    await expect(drawer.getByText('Person 1', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('responses-side-screen.png') });
    await drawer.getByRole('button', { name: 'Open in Responses' }).click();
    await expect(page).toHaveURL(/\/inbox\?.*chart=/);
    await expect(page.getByText('20 responses').first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('From a chart')).toBeVisible();
  });

  test('a drill-down: two levels, an interactive preview, saved on the dashboard; a click opens the next level, the last one opens the responses in the side screen', async ({ page, context }, testInfo) => {
    const fake = await installBackend(context);
    await openInsights(page);
    await toDrillBasics(page);
    await expect(page.getByRole('heading', { name: 'Create drill-down chart' })).toBeVisible();
    await expect(page.getByLabel('Chart title')).toHaveValue('Responses by Plan, then Age');
    await expect(page.getByText('Add the levels in the next step to see your chart preview.')).toBeVisible();
    await expect(page.getByLabel('Aggregation')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('drill-basics.png') });
    await next(page).click();

    await expect(page.getByRole('heading', { name: 'Drill-down levels', level: 2 })).toBeFocused();
    await expect(page.locator('#level-0-field')).toHaveValue('q:f-plan');
    await expect(page.locator('#level-1-field')).toHaveValue('q:f-age');
    await expect(page.getByRole('button', { name: 'Remove level 1' })).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath('drill-levels.png') });
    // the level being edited is the one the preview shows: level 2 on its own, and back to the working drill-down
    await page.locator('#level-1-field').focus();
    await expect(page.getByRole('region', { name: 'Level 2 preview' }).getByText(/Level 2 of 2: by Age\. Shown on its own/)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('drill-levels-level-2.png') });
    await page.getByRole('button', { name: 'Try the whole drill-down' }).click();
    await expect(page.getByRole('region', { name: 'Interactive preview' })).toBeVisible();
    await next(page).click();

    await expect(page.getByRole('heading', { name: 'Preview & save' })).toBeFocused();
    const preview = page.getByRole('region', { name: 'Interactive preview' });
    await expect(preview.getByRole('navigation', { name: 'Drill-down path' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Drill-down path levels' })).toBeVisible();
    await preview.getByRole('button', { name: 'Show as a table' }).click();
    await preview.getByRole('button', { name: 'See responses: Pro' }).click();
    await expect(preview.getByText(/Level 2 of 2: by Age/)).toBeVisible();
    await expect.poll(() => fake.paths().at(-1)).toEqual([{ level: 0, key: 'Pro' }]);
    await page.screenshot({ path: testInfo.outputPath('drill-preview-level-2.png') });
    await page.getByRole('button', { name: 'Save to dashboard' }).click();

    await expect(page).toHaveURL(/\/insights$/);
    expect(fake.created()[0]).toMatchObject({ title: 'Responses by Plan, then Age', chartType: 'auto', definition: { kind: 'drilldown', levels: [{ field: { fieldId: 'f-plan' } }, { field: { fieldId: 'f-age' } }] } });
    const card = page.getByLabel('Responses by Plan, then Age', { exact: true });
    await expect(card).toBeVisible();
    await expect(card.getByText('Drill-down', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('drill-dashboard.png') });

    // opening the table does not make the card taller (it takes the chart's place), so the cards beside it are not stretched either
    const heightBefore = (await card.boundingBox())!.height;
    await card.getByRole('button', { name: 'Show as a table' }).click();
    await expect(card.getByRole('region', { name: /: table$/ })).toBeVisible();
    expect(Math.abs((await card.boundingBox())!.height - heightBefore), 'the card keeps its height').toBeLessThanOrEqual(2);
    await page.screenshot({ path: testInfo.outputPath('drill-card-table.png') });
    await card.getByRole('button', { name: 'See responses: Pro' }).click();
    await expect(card.getByText(/Level 2 of 2: by Age/)).toBeVisible();
    await expect(card.getByRole('button', { name: 'See these 20 responses' })).toBeVisible();
    await card.getByRole('button', { name: 'See responses: 18–27' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByRole('heading', { name: 'Pro › 18–27 - 10 responses' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('drill-responses-side-screen.png') });
    await drawer.getByRole('button', { name: 'Open in Responses' }).click();
    await expect(page).toHaveURL(/\/inbox\?.*chart=/);
    expect(decodeURIComponent(page.url())).toContain('"path":[{"level":0,"key":"Pro"}]');
    await expect(page.getByText('10 responses').first()).toBeVisible({ timeout: 60000 });
  });

  for (const width of [360, 1440]) {
    test(`${width}px: the drill-down levels and the interactive preview fit the screen, and axe is clean`, async ({ page, context }, testInfo) => {
      await installBackend(context);
      await openInsights(page, width);
      await toDrillBasics(page);
      expect(await page.evaluate(NO_SCROLL)).toBe(true);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const check = async (where: string) => {
        await page.waitForTimeout(700); // a change asks again after 250 ms; check the chart once it has settled
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
        const violations = await page.evaluate(async () => {
          const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
          return r.violations.map((v: any) => `${v.id}: ${v.nodes.map((n: any) => n.target.join(' ')).join(' | ')}`);
        });
        expect(violations, where).toEqual([]);
      };
      await check('drill-down basics');
      await next(page).click();
      await page.getByRole('button', { name: 'Add level' }).click();
      await expect(page.locator('#level-2-field')).toBeVisible();
      expect(await page.evaluate(NO_SCROLL)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`drill-levels-${width}.png`) });
      await check('drill-down levels');
      await next(page).click();
      await expect(page.getByRole('heading', { name: 'Preview & save' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Drill-down path levels' })).toBeVisible();
      expect(await page.evaluate(NO_SCROLL)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`drill-save-${width}.png`) });
      await check('drill-down preview and save');
    });
  }

  test('the first step fits one screen: pictures are a fixed height, and the page does not scroll up and down', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await openInsights(page, 1440);
    await page.getByRole('button', { name: 'Add chart' }).first().click();
    await expect(page.getByRole('heading', { name: 'What kind of chart?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' }).first()).toBeVisible();
    const art = (await page.getByRole('img', { name: /A chart with coloured bars/ }).boundingBox())!;
    expect(art.height, 'the picture is a small illustration').toBeLessThan(150);
    await page.screenshot({ path: testInfo.outputPath('wizard-kind.png') });
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1), 'no vertical scrolling at 1440 x 900').toBe(true);
  });

  test('filters with a group: AND switched to OR, a group of its own, and the title says what the filters are', async ({ page, context }, testInfo) => {
    const fake = await installBackend(context);
    await openInsights(page);
    await toBasics(page);
    await next(page).click();
    await expect(page.getByRole('heading', { name: 'Configure chart' })).toBeVisible();
    await page.getByRole('button', { name: 'Add filter', exact: true }).first().click();
    await page.getByLabel('Filter 1: field').selectOption('q:f-age');
    await page.getByLabel('Filter 1: condition').selectOption('gt');
    await page.getByLabel('Filter 1: value').fill('25');
    await page.getByRole('button', { name: 'Add filter group' }).click();
    await page.getByLabel('Filter 2.1: value').selectOption('Pro');
    await page.getByRole('button', { name: /The filters are joined by AND/ }).click();
    await expect(page.getByRole('button', { name: /The filters are joined by OR/ })).toBeVisible();
    await expect(page.getByText('Responses by Plan (Age > 25 or (Plan = Pro))')).toBeVisible();
    await expect.poll(() => fake.queries().at(-1)?.filters?.op).toBe('or');
    expect(fake.queries().at(-1).filters.items[1]).toMatchObject({ op: 'and', items: [{ field: { kind: 'question', fieldId: 'f-plan' }, op: 'is', value: 'Pro' }] });
    // a row is tidy: the remove button is on the field's line, not alone under it
    const field = (await page.getByLabel('Filter 1: field').boundingBox())!;
    const remove = (await page.getByRole('button', { name: 'Remove filter 1' }).boundingBox())!;
    expect(Math.abs(remove.y + remove.height / 2 - (field.y + field.height / 2))).toBeLessThan(12);
    const op = (await page.getByLabel('Filter 1: condition').boundingBox())!;
    expect(op.x).toBeGreaterThan(field.x + field.width - 2); // one row on a wide screen: field, then condition
    await page.screenshot({ path: testInfo.outputPath('wizard-filters.png') });
    // a filter with no value is named, and blocks
    await page.getByRole('button', { name: 'Add filter', exact: true }).first().click();
    await next(page).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Fill in every filter' })).toBeVisible();
  });

  test('edit, duplicate, resize and remove (asked first) from a chart card; no Move earlier / Move later in the menu', async ({ page, context }, testInfo) => {
    const fake = await installBackend(context, [chartRow('c1', 0, 'Plans'), chartRow('c2', 1, 'Plans again')]);
    await openInsights(page);
    await expect(page.getByLabel('Plans', { exact: true })).toBeVisible();

    // moving a chart is the drag handle's job: the menu has no Move earlier / Move later
    await openCardMenu(page, 'Plans');
    await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Move earlier|Move later/ })).toHaveCount(0);
    await page.keyboard.press('Escape');

    // duplicate
    await openCardMenu(page, 'Plans again');
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    await expect(page.getByLabel('Plans again (copy)', { exact: true })).toBeVisible();
    expect(fake.duplicated()).toEqual(['c2']);

    // edit: starts on step 2, saves with the version it read
    await openCardMenu(page, 'Plans');
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(page).toHaveURL(/\/charts\/c1\/edit/);
    await expect(page.getByRole('heading', { name: 'Edit simple chart' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Basic information' })).toBeVisible();
    await page.getByLabel('Chart title').fill('Plans by tier');
    await next(page).click();
    await next(page).click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(/\/insights$/);
    expect(fake.patched()[0]).toMatchObject({ id: 'c1', title: 'Plans by tier', expectedVersion: 1 });
    await expect(page.getByLabel('Plans by tier', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('dashboard-after-edit.png') });

    // size: the same Small / Medium / Large as the wizard, from the card's menu
    await openCardMenu(page, 'Plans by tier');
    await expect(page.getByRole('menuitem', { name: 'Size: Medium' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Size: Large' }).click();
    await expect.poll(() => fake.patched().at(-1)).toMatchObject({ id: 'c1', size: 'large' });
    await openCardMenu(page, 'Plans by tier');
    await expect(page.getByRole('menuitem', { name: 'Size: Large' })).toBeVisible();
    await page.keyboard.press('Escape');

    // remove: the card asks first
    await openCardMenu(page, 'Plans by tier');
    await page.getByRole('menuitem', { name: 'Remove' }).click();
    await expect(page.getByRole('alertdialog', { name: 'Remove Plans by tier?' })).toBeVisible();
    expect(fake.deleted()).toEqual([]);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
    await expect.poll(() => fake.deleted()).toEqual(['c1']);
    await expect(page.getByLabel('Plans by tier', { exact: true })).toHaveCount(0);
  });

  test('cards side by side are the same height, and a short one is spaced out inside (chart centred, notes at the bottom) rather than left with an empty half', async ({ page, context }, testInfo) => {
    const drill = chartRow('c2', 1, 'Plans then age', {
      kind: 'drilldown',
      definition: { kind: 'drilldown', measure: { type: 'count' }, levels: [{ field: { kind: 'question', fieldId: 'f-plan' } }, { field: { kind: 'question', fieldId: 'f-age' } }], display: { values: 'counts', legend: true, dataLabels: false, palette: 'theme', interactive: true } },
    });
    await installBackend(context, [chartRow('c1', 0, 'Plans'), drill]);
    await openInsights(page);
    const simple = page.getByLabel('Plans', { exact: true });
    const tall = page.getByLabel('Plans then age', { exact: true });
    await expect(simple.getByText(/40 responses/)).toBeVisible();
    await expect(tall.getByText(/Level 1 of 2/)).toBeVisible();
    const a = (await simple.boundingBox())!;
    const b = (await tall.boundingBox())!;
    expect(Math.abs(a.y - b.y), 'the two sit in one row').toBeLessThan(2);
    expect(Math.abs(a.height - b.height), 'the two are the same height').toBeLessThan(2);
    // the last line of each card (Show as a table) sits at the bottom of it, whatever the card holds
    for (const [card, box] of [[simple, a], [tall, b]] as const) {
      const toggle = (await card.getByRole('button', { name: 'Show as a table' }).boundingBox())!;
      expect(box.y + box.height - (toggle.y + toggle.height), 'space under the last line').toBeLessThan(40);
    }
    await page.screenshot({ path: testInfo.outputPath('cards-same-height.png') });
  });

  for (const width of [360, 768, 1440]) {
    test(`${width}px: every step fits the screen without sideways scrolling, and the footer stays reachable`, async ({ page, context }, testInfo) => {
      await installBackend(context);
      await openInsights(page, width);
      await toBasics(page);
      expect(await page.evaluate(NO_SCROLL)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`basics-${width}.png`) });
      await next(page).click();
      await page.getByRole('button', { name: 'Add filter', exact: true }).first().click();
      await page.getByRole('button', { name: 'Add filter group' }).click();
      expect(await page.evaluate(NO_SCROLL)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`configure-${width}.png`) });
      await page.getByRole('button', { name: 'Clear all' }).click();
      await next(page).click();
      await expect(page.getByRole('heading', { name: 'Preview & save' })).toBeVisible();
      expect(await page.evaluate(NO_SCROLL)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`save-${width}.png`) });
      const save = (await page.getByRole('button', { name: 'Save to dashboard' }).boundingBox())!;
      expect(save.y + save.height, 'Save is on screen').toBeLessThanOrEqual(900);
    });
  }

  test('no accessibility violations on any step (axe, WCAG A and AA)', async ({ page, context }) => {
    await installBackend(context);
    await openInsights(page);
    await toBasics(page);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    // a chart that is still refreshing is dimmed for a moment: check it once it has settled
    const settled = async () => {
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      await page.waitForTimeout(400);
    };
    const run = async () => {
      await settled();
      return page.evaluate(async () => {
        const axe = (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
        const r = await axe.run({ include: [['main']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
        return r.violations.map((v) => ({ id: v.id, targets: v.nodes.map((x) => x.target.join(' ')).slice(0, 4) }));
      });
    };
    expect(await run(), 'step 2').toEqual([]);
    await next(page).click();
    await page.getByRole('button', { name: 'Add filter', exact: true }).first().click();
    await expect(page.getByLabel('Filter 1: field')).toBeVisible();
    expect(await run(), 'step 3').toEqual([]);
    await page.getByLabel('Filter 1: value').selectOption('Pro');
    await next(page).click();
    await expect(page.getByRole('heading', { name: 'Preview & save' })).toBeVisible();
    expect(await run(), 'step 4').toEqual([]);
  });
});
