import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * A Board card can be dropped between two others, and a line shows where it will land. The card stays there: the fake backend keeps the
 * order it is told (POST /api/responses/:id/board-position) and serves each column in it. Real browser, real pointer events.
 */
const FORM_ID = 'e2e-board-position-form';
const STAGES = [
  { id: 'new', name: 'New' },
  { id: 'in_progress', name: 'In Progress' },
  { id: 'completed', name: 'Completed' },
];
const FIELDS = [
  { fieldId: 'f-name', pageId: 'p1', type: 'short_text', label: 'Full name', required: false, deleted: false, order: 0 },
  { fieldId: 'f-film', pageId: 'p1', type: 'short_text', label: 'Title of the film', required: false, deleted: false, order: 1 },
  { fieldId: 'f-genre', pageId: 'p1', type: 'short_text', label: 'Genre', required: false, deleted: false, order: 2 },
];
const PEOPLE: Record<string, { name: string; film: string; genre: string }> = {
  r1: { name: 'Asha Rao', film: 'Monsoon Road', genre: 'Drama' },
  r2: { name: 'Ben Cole', film: 'Night Train', genre: 'Thriller' },
  r3: { name: 'Chitra Nair', film: 'Paper Boats', genre: 'Family' },
  r4: { name: 'Dev Shah', film: 'Salt Lake', genre: 'Comedy' },
  r5: { name: 'Esha Roy', film: 'Last Ferry', genre: 'Drama' },
};

interface Fake {
  order: () => Record<string, string[]>;
  patches: () => { id: string; body: Record<string, unknown> }[];
  places: () => { id: string; body: Record<string, unknown> }[];
}

async function installBackend(context: BrowserContext): Promise<Fake> {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  // Each column, top to bottom.
  const order: Record<string, string[]> = { new: ['r1', 'r2', 'r3'], in_progress: ['r4', 'r5'], completed: [] };
  const patches: { id: string; body: Record<string, unknown> }[] = [];
  const places: { id: string; body: Record<string, unknown> }[] = [];
  const stageOf = (id: string) => Object.keys(order).find((s) => order[s].includes(id))!;
  const response = (id: string) => ({
    _id: id, formId: FORM_ID, reference: `#${id}`, answers: { 'Full name': PEOPLE[id].name, 'Title of the film': PEOPLE[id].film, Genre: PEOPLE[id].genre },
    assignee: null, tags: [], unread: false,
    stage: { ...STAGES.find((s) => s.id === stageOf(id)), colour: 'neutral', category: stageOf(id) },
    submittedAt: '2026-10-16T10:00:00.000Z', createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z',
  });

  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/backend/', '');
    const json = (body: unknown, code = 200) => route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === 'api/responses' && req.method() === 'GET') {
      const wanted = url.searchParams.get('status') ?? url.searchParams.get('stageId') ?? '';
      const rows = (wanted ? (order[wanted] ?? []) : Object.values(order).flat()).map(response);
      return json({ success: true, data: rows, total: rows.length, page: 1, limit: 20, totalPages: 1 });
    }
    const place = path.match(/^api\/responses\/([^/]+)\/board-position$/);
    if (place && req.method() === 'POST') {
      const id = place[1];
      const body = req.postDataJSON() as { afterId?: string; beforeId?: string };
      places.push({ id, body });
      const column = order[stageOf(id)];
      column.splice(column.indexOf(id), 1);
      const at = body.afterId ? column.indexOf(body.afterId) + 1 : body.beforeId ? column.indexOf(body.beforeId) : 0;
      column.splice(at, 0, id);
      return json({ success: true });
    }
    const patch = path.match(/^api\/responses\/([^/]+)$/);
    if (patch && req.method() === 'PATCH') {
      const id = patch[1];
      const body = req.postDataJSON() as { status?: string };
      patches.push({ id, body });
      order[stageOf(id)].splice(order[stageOf(id)].indexOf(id), 1);
      order[String(body.status)].unshift(id); // a stage change puts the card on top, like the real API
      return json({ success: true, response: response(id) });
    }
    if (path === `api/forms/${FORM_ID}`) return json({ _id: FORM_ID, title: 'Board form', fields: FIELDS, pages: [], status: 'published', workspaceId: null });
    if (path === 'api/responses/stats') return json({ total: 5, unread: 0 });
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags|views/.test(path)) return json([]);
    return json({});
  });
  return { order: () => order, patches: () => patches, places: () => places };
}

async function openBoard(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/forms/${FORM_ID}/inbox?view=board`);
  await expect(page.getByRole('listitem', { name: 'New column' })).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('button', { name: /Drag Asha Rao/ })).toBeVisible({ timeout: 30000 });
}

const column = (page: Page, name: string) => page.getByRole('listitem', { name: `${name} column` });
const names = (page: Page, col: string) => column(page, col).getByRole('button', { name: /^Open response from/ }).allInnerTexts();
const handle = (page: Page, person: string) => page.getByRole('button', { name: new RegExp(`Drag ${person}`) });

/** Drags a card by its handle to a point on another card (`where`: its top or bottom quarter), and returns before letting go. */
async function dragOnto(page: Page, person: string, target: string, where: 'top' | 'bottom', drop = true) {
  const from = (await handle(page, person).boundingBox())!;
  const to = (await page.getByRole('button', { name: new RegExp(`Open response from\\s*${target}`) }).locator('xpath=ancestor::div[contains(@class,"board-card")]').boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 30, from.y + 20, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + (where === 'top' ? to.height * 0.2 : to.height * 0.8), { steps: 14 });
  if (drop) await page.mouse.up();
}

test.describe('Board: dropping a card between others', () => {
  test('a line shows where the card will land, and dropping it there keeps it there', async ({ page, context }, testInfo) => {
    const fake = await installBackend(context);
    await openBoard(page);
    expect(await names(page, 'New')).toHaveLength(3);

    // Hover over the bottom half of the last card: the line is drawn under it.
    await dragOnto(page, 'Asha Rao', 'Chitra Nair', 'bottom', false);
    const line = page.locator('[aria-hidden="true"].h-0\\.5');
    await expect(line).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath('drop-line.png'), clip: { x: 0, y: 150, width: 1000, height: 600 } });
    await page.mouse.up();

    await expect.poll(() => fake.places().length).toBe(1);
    expect(fake.places()[0]).toEqual({ id: 'r1', body: { afterId: 'r3' } });
    expect(fake.patches()).toHaveLength(0); // same column: no stage change
    await expect(line).toHaveCount(0);
    expect((await names(page, 'New')).map((n) => n.replace(/Open response from\s*/, '').split('\n')[0])).toEqual(['Ben Cole', 'Chitra Nair', 'Asha Rao']);
    expect(fake.order().new).toEqual(['r2', 'r3', 'r1']);
  });

  test('a card dropped on the top half of a card in another column lands above it, not on top of the column', async ({ page, context }) => {
    const fake = await installBackend(context);
    await openBoard(page);
    await dragOnto(page, 'Ben Cole', 'Esha Roy', 'top');

    await expect.poll(() => fake.places().length).toBe(1);
    expect(fake.patches()).toEqual([{ id: 'r2', body: { status: 'in_progress' } }]);
    expect(fake.places()[0].body).toEqual({ afterId: 'r4', beforeId: 'r5' });
    expect(fake.order().in_progress).toEqual(['r4', 'r2', 'r5']);
    // Shown there at once, between the two it was dropped between.
    const inColumn = (await names(page, 'In Progress')).map((n) => n.replace(/Open response from\s*/, '').split('\n')[0]);
    expect(inColumn).toEqual(['Dev Shah', 'Ben Cole', 'Esha Roy']);
    expect(await names(page, 'New')).toHaveLength(2);
  });

  test('dropping a card where it already is changes nothing', async ({ page, context }) => {
    const fake = await installBackend(context);
    await openBoard(page);
    // Asha is the first card: dropping on the top half of her own neighbour below is the same place.
    await dragOnto(page, 'Asha Rao', 'Ben Cole', 'top');
    await page.waitForTimeout(500);
    expect(fake.places()).toHaveLength(0);
    expect(fake.patches()).toHaveLength(0);
  });

  test('dropping into an empty column just moves the card there', async ({ page, context }) => {
    const fake = await installBackend(context);
    await openBoard(page);
    const from = (await handle(page, 'Chitra Nair').boundingBox())!;
    const target = (await column(page, 'Completed').boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 30, from.y + 20, { steps: 4 });
    await page.mouse.move(target.x + target.width / 2, target.y + 80, { steps: 14 });
    await page.mouse.up();
    await expect.poll(() => fake.patches().length).toBe(1);
    expect(fake.patches()[0]).toEqual({ id: 'r3', body: { status: 'completed' } });
    expect(fake.places()).toHaveLength(0);
  });

  test('the drag handle is the first thing on the card, at its top left', async ({ page, context }) => {
    await installBackend(context);
    await openBoard(page);
    const grip = (await handle(page, 'Asha Rao').boundingBox())!;
    const card = (await page.getByRole('button', { name: /Open response from\s*Asha Rao/ }).locator('xpath=ancestor::div[contains(@class,"board-card")]').boundingBox())!;
    const title = (await page.getByRole('button', { name: /Open response from\s*Asha Rao/ }).boundingBox())!;
    expect(grip.x - card.x).toBeLessThan(12);
    expect(grip.x + grip.width).toBeLessThanOrEqual(title.x);
    expect(grip.y - card.y).toBeLessThan(16);
  });
});

test.describe('Board: card fields', () => {
  test('Card fields chooses the headline, and the choice is kept', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await openBoard(page);
    await expect(page.getByRole('button', { name: /Open response from\s*Asha Rao/ })).toBeVisible();

    await page.getByRole('button', { name: /Card fields/ }).click();
    await page.getByLabel('Title', { exact: true }).selectOption({ label: 'Title of the film' });
    // The preview shows the card as it will look while choosing.
    await expect(page.getByRole('group', { name: 'Card preview' }).getByText('Monsoon Road')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('card-fields-dialog.png') });
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(page.getByRole('button', { name: /Open response from\s*Monsoon Road/ })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('card-fields.png'), clip: { x: 0, y: 150, width: 1000, height: 500 } });

    // Kept for this form in this browser.
    await page.reload();
    await expect(page.getByRole('button', { name: /Open response from\s*Monsoon Road/ })).toBeVisible({ timeout: 60000 });
  });
});
