import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * "Customize" on a form's Responses page: owners and admins change the form's own stages, its table columns, its board card and a few
 * defaults in one panel, and the page changes only after Save. The backend is a fake that lives in the test and keeps the setup in memory.
 */
const FORM_ID = 'e2e-customize-form';
const WS = 'e2e-avatars-ws';
const FIELDS = [
  { fieldId: 'f-name', pageId: 'p1', type: 'short_text', label: 'Full name', required: false, deleted: false, order: 0 },
  { fieldId: 'f-film', pageId: 'p1', type: 'short_text', label: 'Title of the film', required: false, deleted: false, order: 1 },
  { fieldId: 'f-genre', pageId: 'p1', type: 'short_text', label: 'Genre', required: false, deleted: false, order: 2 },
  { fieldId: 'f-budget', pageId: 'p1', type: 'number', label: 'Budget', required: false, deleted: false, order: 3 },
  { fieldId: 'f-lang', pageId: 'p1', type: 'short_text', label: 'Language', required: false, deleted: false, order: 4 },
];
const PEOPLE = [
  { id: 'r1', name: 'Asha Rao', film: 'Monsoon Road', genre: 'Drama', budget: 120, lang: 'Hindi', category: 'new' },
  { id: 'r2', name: 'Ben Cole', film: 'Night Train', genre: 'Thriller', budget: 210, lang: 'English', category: 'in_progress' },
  { id: 'r3', name: 'Chitra Nair', film: 'Paper Boats', genre: 'Family', budget: 80, lang: 'Tamil', category: 'completed' },
];
const WORKSPACE_STAGES = [
  { id: 'w-new', name: 'New', colour: 'neutral', category: 'new', order: 0, isDefault: true },
  { id: 'w-prog', name: 'In Progress', colour: 'warning', category: 'in_progress', order: 1, isDefault: false },
  { id: 'w-done', name: 'Completed', colour: 'success', category: 'completed', order: 2, isDefault: false },
];

interface Fake {
  puts: () => Record<string, any>[];
  patches: () => { id: string; body: Record<string, any> }[];
}

async function installBackend(context: BrowserContext, role: 'admin' | 'viewer'): Promise<Fake> {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  let version = 0;
  let setup: Record<string, any> = {
    tableColumns: ['respondent', 'email', 'tags', 'assignee', 'stage', 'submitted'],
    cardTitle: 'auto', opensAs: 'table', sort: 'newest', respondentFrom: 'auto', rowHeight: 'comfortable', wrap: false,
  };
  let stages: { mode: 'workspace' | 'own'; list: any[]; startIndex: number | null } = { mode: 'workspace', list: [], startIndex: null };
  const puts: Record<string, any>[] = [];
  const patches: { id: string; body: Record<string, any> }[] = [];
  let n = 0;

  const effective = () => (stages.mode === 'own' ? stages.list : WORKSPACE_STAGES);
  const stageOf = (category: string) => {
    const list = effective();
    return list.find((s) => s.category === category) ?? list[0];
  };
  const row = (p: (typeof PEOPLE)[number]) => ({
    _id: p.id, formId: FORM_ID, reference: `#${p.id}`,
    answers: { 'Full name': p.name, 'Title of the film': p.film, Genre: p.genre, Budget: p.budget, Language: p.lang },
    respondentEmail: `${p.name.split(' ')[0].toLowerCase()}@example.com`, assignee: null, tags: [], unread: false, noteCount: 0,
    stage: { ...stageOf(p.category) }, submittedAt: '2026-10-16T10:00:00.000Z', createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z',
  });

  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/backend/', '');
    const json = (body: unknown, code = 200) => route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === 'api/workspaces') return json({ success: true, workspaces: [{ id: '507f1f77bcf86cd799439011', slug: WS, name: 'E2E', role, isOwner: false, memberCount: 2, timezone: 'UTC', logo: null }], total: 1 });
    if (path === `api/workspaces/${WS}/stages`) return json({ success: true, stages: WORKSPACE_STAGES });
    if (path === `api/forms/${FORM_ID}/response-setup`) {
      if (req.method() === 'GET') return json({ success: true, version, setup, stages });
      const body = req.postDataJSON() as Record<string, any>;
      puts.push(body);
      if (body.version !== version) return json({ success: false, message: 'stale', error: { code: 'RESPONSE_SETUP_STALE' } }, 409);
      const { version: _v, stages: stageInput, ...values } = body;
      void _v;
      setup = values;
      version += 1;
      stages =
        stageInput.mode === 'own'
          ? { mode: 'own', list: stageInput.stages.map((s: any, i: number) => ({ id: s.id ?? `own-${(n += 1)}`, name: s.name, colour: s.colour, category: s.category, order: i, isDefault: i === (stageInput.startIndex ?? 0) })), startIndex: stageInput.startIndex ?? 0 }
          : { mode: 'workspace', list: [], startIndex: null };
      return json({ success: true, version, setup, stages });
    }
    if (path === `api/forms/${FORM_ID}`) return json({ _id: FORM_ID, title: 'Film submissions', fields: FIELDS, pages: [], status: 'published', workspaceId: '507f1f77bcf86cd799439011', myRole: role });
    if (path === 'api/responses' && req.method() === 'GET') {
      const wanted = url.searchParams.get('stageId');
      const rows = PEOPLE.map(row).filter((r) => !wanted || r.stage.id === wanted);
      return json({ success: true, data: rows, total: rows.length, page: 1, limit: 50, totalPages: 1 });
    }
    if (path === 'api/responses/stats') {
      const byStage = effective().map((s) => ({ stageId: s.id, name: s.name, category: s.category, colour: s.colour, count: PEOPLE.map(row).filter((r) => r.stage.id === s.id).length }));
      return json({ total: PEOPLE.length, unread: 0, byStage, byCategory: { new: 1, in_progress: 1, completed: 1 } });
    }
    const patch = path.match(/^api\/responses\/([^/]+)$/);
    if (patch && req.method() === 'PATCH') {
      patches.push({ id: patch[1], body: req.postDataJSON() });
      return json({ success: true, response: row(PEOPLE[0]) });
    }
    if (req.method() === 'GET' && /notifications|members|tags|views|activity/.test(path)) return json([]);
    return json({});
  });
  return { puts: () => puts, patches: () => patches };
}

async function open(page: Page, query = '') {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/forms/${FORM_ID}/inbox?ws=${WS}${query}`);
  await expect(page.getByRole('button', { name: /Open response from/ }).first()).toBeVisible({ timeout: 60000 });
}
const customize = (page: Page) => page.getByRole('button', { name: 'Customize' });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Customize responses' });
const save = (page: Page) => drawer(page).getByRole('button', { name: 'Save changes' });

test.describe('Customize responses', () => {
  test('an admin sees the Customize button in the form header beside Export; a viewer does not', async ({ page, context }) => {
    await installBackend(context, 'admin');
    await open(page);
    await expect(customize(page)).toBeVisible();
    const c = (await customize(page).boundingBox())!;
    const e = (await page.getByRole('button', { name: 'Export', exact: true }).boundingBox())!;
    expect(Math.abs(c.y - e.y)).toBeLessThan(8);
  });

  test('a viewer cannot customize', async ({ page, context }) => {
    await installBackend(context, 'viewer');
    await open(page);
    await expect(customize(page)).toHaveCount(0);
  });

  test('stages: switch to the form\'s own stages, rename one and add one, preview nothing until saved, then the page uses them', async ({ page, context }, testInfo) => {
    const fake = await installBackend(context, 'admin');
    await open(page);
    await customize(page).click();
    await expect(drawer(page)).toBeVisible();
    expect((await drawer(page).boundingBox())!.width).toBeGreaterThan(900); // a big panel, not a narrow strip
    await expect(save(page)).toBeDisabled();

    await drawer(page).getByRole('radio', { name: /This form has its own stages/ }).check();
    await drawer(page).getByLabel('Name of stage 1').fill('Received');
    await drawer(page).getByRole('button', { name: 'Add a stage' }).click();
    await drawer(page).getByLabel('Name of stage 4').fill('Shortlisted');
    await expect(drawer(page).getByRole('status')).toHaveText('Not saved yet');
    await page.screenshot({ path: testInfo.outputPath('customize-stages.png') });

    // the page behind has not changed yet
    await expect(page.getByRole('button', { name: /^New\b/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Shortlisted/ })).toHaveCount(0);

    await save(page).click();
    // the form has responses, so changing its stages asks before moving them
    await expect(page.getByText('Move the responses to the new stages?')).toBeVisible();
    expect(fake.puts()).toHaveLength(0);
    await page.getByRole('button', { name: 'Save and move them' }).click();
    await expect(drawer(page)).toHaveCount(0);
    expect(fake.puts()).toHaveLength(1);
    expect(fake.puts()[0].stages).toMatchObject({ mode: 'own', startIndex: 0 });
    expect(fake.puts()[0].stages.stages.map((s: { name: string }) => s.name)).toEqual(['Received', 'In Progress', 'Completed', 'Shortlisted']);
    await expect(page.getByRole('button', { name: /^Shortlisted/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Received/ })).toBeVisible();
  });

  test('columns are moved by dragging a handle; the first column, whatever it is, carries the picture', async ({ page, context }) => {
    const fake = await installBackend(context, 'admin');
    await open(page);
    await customize(page).click();
    await drawer(page).getByRole('tab', { name: 'Table columns' }).click();
    await drawer(page).getByRole('button', { name: /^More columns/ }).click(); // only four columns are offered as buttons
    await drawer(page).getByRole('button', { name: 'Title of the film', exact: true }).click(); // added last: q:f-film
    const handle = drawer(page).getByRole('button', { name: 'Move Title of the film', exact: true });
    const target = drawer(page).getByRole('button', { name: 'Move Respondent', exact: true });
    const from = (await handle.boundingBox())!;
    const to = (await target.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y - 20, { steps: 6 });
    await page.mouse.move(to.x + to.width / 2, to.y + 2, { steps: 20 });
    await page.mouse.up();
    const preview = drawer(page).getByRole('region', { name: 'Table preview' });
    await expect(preview.getByRole('columnheader').first()).toHaveText('Title of the film');
    // the picture follows the first column, and the Respondent column no longer has one
    const firstRow = preview.getByRole('row').nth(1);
    await expect(firstRow.getByRole('cell').first().locator('.bg-avatar')).toHaveCount(1);
    await expect(firstRow.getByRole('cell').nth(1).locator('.bg-avatar')).toHaveCount(0);
    await save(page).click();
    await expect(drawer(page)).toHaveCount(0);
    expect(fake.puts()[0].tableColumns[0]).toBe('q:f-film');
    const table = page.getByRole('table');
    await expect(table.getByRole('row').nth(1).getByRole('cell').first().locator('.bg-avatar')).toHaveCount(1);
  });

  test('table columns: add questions, see them in the preview, save, and the table scrolls sideways with the first column kept', async ({ page, context }, testInfo) => {
    const fake = await installBackend(context, 'admin');
    await open(page);
    await customize(page).click();
    await drawer(page).getByRole('tab', { name: 'Table columns' }).click();
    await drawer(page).getByRole('button', { name: /^More columns/ }).click(); // only four columns are offered as buttons
    for (const q of ['Title of the film', 'Genre', 'Budget', 'Language']) await drawer(page).getByRole('button', { name: q, exact: true }).click();
    const preview = drawer(page).getByRole('region', { name: 'Table preview' });
    await expect(preview.getByRole('columnheader', { name: 'Language' })).toBeAttached();
    await expect(preview.getByText('Monsoon Road')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('customize-columns.png') });
    await save(page).click();
    await expect(drawer(page)).toHaveCount(0);
    expect(fake.puts()[0].tableColumns).toEqual(['respondent', 'email', 'tags', 'assignee', 'stage', 'submitted', 'q:f-film', 'q:f-genre', 'q:f-budget', 'q:f-lang']);

    // in the table itself
    const table = page.getByRole('table');
    await expect(table.getByRole('columnheader', { name: 'Title of the film' })).toBeVisible();
    await expect(table.getByText('Monsoon Road')).toBeVisible();
    const frame = page.locator('.bg-table-wrap');
    const wide = await frame.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(wide, 'ten columns do not fit: the table scrolls sideways inside its frame').toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'the page itself does not scroll sideways').toBe(true);
    // the first column stays in view while scrolling
    const before = (await table.getByRole('columnheader', { name: 'Respondent' }).boundingBox())!.x;
    await frame.evaluate((el) => (el.scrollLeft = el.scrollWidth));
    const after = (await table.getByRole('columnheader', { name: 'Respondent' }).boundingBox())!.x;
    expect(Math.abs(after - before)).toBeLessThan(2);
    await page.screenshot({ path: testInfo.outputPath('table-scrolled.png') });
  });

  test('defaults: Opens as Board makes the page open on the Board, and Table can still be chosen', async ({ page, context }) => {
    await installBackend(context, 'admin');
    await open(page);
    await customize(page).click();
    await drawer(page).getByRole('tab', { name: 'Defaults' }).click();
    await drawer(page).getByLabel('Opens as').selectOption('board');
    await save(page).click();
    await expect(drawer(page)).toHaveCount(0);

    await page.goto(`/forms/${FORM_ID}/inbox?ws=${WS}`);
    await expect(page.getByRole('list', { name: 'Responses board' })).toBeVisible({ timeout: 60000 });
    await page.getByRole('radio', { name: 'Table' }).or(page.getByRole('button', { name: 'Table', exact: true })).first().click();
    await expect(page).toHaveURL(/view=table/);
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('board card: the title question headlines the cards', async ({ page, context }) => {
    await installBackend(context, 'admin');
    await open(page, '&view=board');
    await expect(page.getByRole('button', { name: /Open response from\s*Asha Rao/ })).toBeVisible();
    await customize(page).click();
    await drawer(page).getByRole('tab', { name: 'Board card' }).click();
    await drawer(page).getByLabel('Card title').selectOption({ label: 'Title of the film' });
    await save(page).click();
    await expect(page.getByRole('button', { name: /Open response from\s*Monsoon Road/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Open response from\s*Asha Rao/ })).toHaveCount(0);
  });

  test('the stage in a table row is a button: pick another stage and the response moves without being opened', async ({ page, context }) => {
    const fake = await installBackend(context, 'admin');
    await open(page);
    await page.getByRole('button', { name: 'Stage: New. Press to change it.' }).click();
    await expect(page.getByRole('menuitem')).toHaveText(['New', 'In Progress', 'Completed']);
    await page.getByRole('menuitem', { name: 'In Progress' }).click();
    await expect.poll(() => fake.patches().length).toBe(1);
    expect(fake.patches()[0]).toEqual({ id: 'r1', body: { stageId: 'w-prog' } });
    await expect(page).not.toHaveURL(/responseId=/); // the response was not opened
  });

  test('closing with unsaved changes asks first, and the question is above the panel', async ({ page, context }) => {
    const fake = await installBackend(context, 'admin');
    await open(page);
    await customize(page).click();
    await drawer(page).getByRole('tab', { name: 'Defaults' }).click();
    await drawer(page).getByLabel('Row height').selectOption('compact');
    await drawer(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Discard your changes?')).toBeVisible();
    // it is on top of the panel, not behind it: its button can be clicked
    await page.getByRole('button', { name: 'Keep editing' }).click();
    await expect(drawer(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Discard your changes?')).toBeVisible();
    await page.getByRole('button', { name: 'Discard changes' }).click();
    await expect(drawer(page)).toHaveCount(0);
    expect(fake.puts()).toHaveLength(0);
  });
});

test.describe('The Responses page top layout', () => {
  test('three rows: title and actions, the switch with the search bar, then the stage pills with the view switch', async ({ page, context }, testInfo) => {
    await installBackend(context, 'admin');
    await open(page);
    const box = async (loc: ReturnType<Page['locator']>) => (await loc.first().boundingBox())!;
    const crumb = await box(page.getByRole('navigation', { name: 'Breadcrumb' }));
    const exportBtn = await box(page.getByRole('button', { name: 'Export', exact: true }));
    const edit = await box(page.getByRole('link', { name: 'Edit form' }));
    const customizeBtn = await box(page.getByRole('button', { name: 'Customize responses' }));
    const mode = await box(page.getByRole('group', { name: 'Form data view' }));
    const views = await box(page.getByRole('group', { name: 'Responses view' }));
    const pill = await box(page.getByRole('button', { name: /^All/, pressed: true }));
    const search = await box(page.getByLabel('Search responses'));

    // row 1: where you are (title is the last crumb), then Export, Edit and Customize in that order, all level
    expect(Math.abs(crumb.y + crumb.height / 2 - (exportBtn.y + exportBtn.height / 2))).toBeLessThan(12);
    expect(exportBtn.x).toBeLessThan(edit.x);
    expect(edit.x).toBeLessThan(customizeBtn.x);
    expect(Math.abs(exportBtn.y - edit.y)).toBeLessThan(2);
    expect(Math.abs(edit.y - customizeBtn.y)).toBeLessThan(2);
    expect(exportBtn.height).toBeLessThan(40); // compact buttons
    expect(await page.getByRole('button', { name: 'Customize responses' }).innerText()).toBe('Customize');
    // row 2: the Insights / Responses switch, then the search bar, level
    expect(mode.y).toBeGreaterThan(edit.y + edit.height);
    expect(Math.abs(mode.y + mode.height / 2 - (search.y + search.height / 2))).toBeLessThan(12);
    expect(mode.x).toBeLessThan(search.x);
    // row 3: the stage pills at the left, the Table / Board / Calendar switch at the right, level
    expect(pill.y).toBeGreaterThan(mode.y + mode.height - 2);
    expect(Math.abs(pill.y + pill.height / 2 - (views.y + views.height / 2))).toBeLessThan(12);
    expect(pill.x).toBeLessThan(views.x);
    expect(search.height).toBe(36);
    expect(await page.getByRole('button', { name: 'Table' }).getAttribute('aria-pressed')).toBe('true');
    await page.screenshot({ path: testInfo.outputPath('top-layout.png'), clip: { x: 0, y: 0, width: 1440, height: 380 } });
  });

  test('the saved-view picker and Save view are at the right end of the search bar', async ({ page, context }) => {
    await installBackend(context, 'admin');
    await open(page);
    const search = (await page.getByLabel('Search responses').boundingBox())!;
    const picker = (await page.getByRole('button', { name: /^Saved views:/ }).or(page.getByRole('button', { name: 'Save view' })).first().boundingBox())!;
    expect(Math.abs(picker.y + picker.height / 2 - (search.y + search.height / 2))).toBeLessThan(24);
    expect(picker.x).toBeGreaterThan(search.x + search.width);
  });

  test('the Insights page has the same two rows: the switch, and Filters and Add chart on its right', async ({ page, context }) => {
    await installBackend(context, 'admin');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/forms/${FORM_ID}/insights?ws=${WS}`);
    await expect(page.getByRole('group', { name: 'Form data view' })).toBeVisible({ timeout: 60000 });
    const mode = (await page.getByRole('group', { name: 'Form data view' }).boundingBox())!;
    const edit = (await page.getByRole('link', { name: 'Edit form' }).boundingBox())!;
    expect(mode.y).toBeGreaterThan(edit.y + edit.height - 2);
    expect(mode.x).toBeLessThan(edit.x);
    await expect(page.getByRole('button', { name: 'Insights' })).toHaveAttribute('aria-pressed', 'true');
  });
});
