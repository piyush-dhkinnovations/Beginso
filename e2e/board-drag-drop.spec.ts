import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * QA D8-008: the Board only changed a stage through a per-card menu. Cards can now be dragged to another column (pointer) or moved
 * with the keyboard (Space, Left/Right, Space). Real browser, real pointer events: the backend is a fake that lives in the test and
 * records every stage change it is sent.
 */
const FORM_ID = 'e2e-board-form';
const STAGES = [
  { id: 'new', name: 'New' },
  { id: 'in_progress', name: 'In Progress' },
  { id: 'completed', name: 'Completed' },
];

interface FakeBackend {
  patches: () => { id: string; body: Record<string, unknown> }[];
  stageOf: (id: string) => string;
}

async function installBackend(context: BrowserContext, opts: { failPatch?: boolean } = {}): Promise<FakeBackend> {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const status: Record<string, string> = { r1: 'new', r2: 'new' };
  const patches: { id: string; body: Record<string, unknown> }[] = [];
  const response = (id: string, email: string) => ({
    _id: id, formId: FORM_ID, reference: `#${id}`, answers: {}, respondentEmail: email, assignee: null, tags: [], unread: false,
    stage: { ...STAGES.find((s) => s.id === status[id]), colour: 'neutral', category: status[id] },
    submittedAt: '2026-10-16T10:00:00.000Z', createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z',
  });
  const people: Record<string, string> = { r1: 'asha@example.com', r2: 'ben@example.com' };

  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/backend/', '');
    const json = (body: unknown, code = 200) => route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === 'api/responses' && req.method() === 'GET') {
      const wanted = url.searchParams.get('status') ?? url.searchParams.get('stageId');
      const rows = Object.keys(status).filter((id) => !wanted || status[id] === wanted).map((id) => response(id, people[id]));
      return json({ success: true, data: rows, total: rows.length, page: 1, limit: 20, totalPages: 1 });
    }
    const patch = path.match(/^api\/responses\/([^/]+)$/);
    if (patch && req.method() === 'PATCH') {
      patches.push({ id: patch[1], body: req.postDataJSON() });
      if (opts.failPatch) return json({ message: 'boom' }, 500);
      status[patch[1]] = String((req.postDataJSON() as { status?: string }).status);
      return json({ success: true, response: response(patch[1], people[patch[1]]) });
    }
    if (path === `api/forms/${FORM_ID}`) return json({ _id: FORM_ID, title: 'Board form', fields: [], pages: [], status: 'published', workspaceId: null });
    if (path === 'api/responses/stats') return json({ total: 2, unread: 0 });
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags|views/.test(path)) return json([]);
    return json({});
  });
  return { patches: () => patches, stageOf: (id) => status[id] };
}

async function openBoard(page: Page) {
  await page.goto(`/forms/${FORM_ID}/inbox?view=board`);
  await expect(page.getByRole('listitem', { name: 'New column' })).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('button', { name: "Drag asha@example.com's response to another stage" })).toBeVisible({ timeout: 30000 });
}

const column = (page: Page, name: string) => page.getByRole('listitem', { name: `${name} column` });
const card = (page: Page, email: string) => page.getByRole('button', { name: `Open response from ${email}` });

test.describe('Board drag and drop', () => {
  test('dragging a card to another column moves it there at once and saves the new stage', async ({ page, context }) => {
    const backend = await installBackend(context);
    await openBoard(page);
    await expect(column(page, 'New').getByRole('button', { name: 'Open response from asha@example.com' })).toBeVisible();

    const handle = page.getByRole('button', { name: "Drag asha@example.com's response to another stage" });
    const from = (await handle.boundingBox())!;
    const target = (await column(page, 'In Progress').boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y + 20, { steps: 4 });
    await page.mouse.move(target.x + target.width / 2, target.y + 60, { steps: 12 });
    await page.mouse.up();

    await expect(column(page, 'In Progress').getByRole('button', { name: 'Open response from asha@example.com' })).toBeVisible();
    await expect(column(page, 'New').getByRole('button', { name: 'Open response from asha@example.com' })).toHaveCount(0);
    await expect.poll(() => backend.patches().length).toBe(1);
    expect(backend.patches()[0]).toEqual({ id: 'r1', body: { status: 'in_progress' } });
    // The other card never moved.
    await expect(column(page, 'New').getByRole('button', { name: 'Open response from ben@example.com' })).toBeVisible();
  });

  test('a click on the handle without moving does not change a stage', async ({ page, context }) => {
    const backend = await installBackend(context);
    await openBoard(page);
    await page.getByRole('button', { name: "Drag asha@example.com's response to another stage" }).click();
    await page.waitForTimeout(400);
    expect(backend.patches()).toHaveLength(0);
  });

  test('the keyboard moves a card a column at a time: Space, Right, Space', async ({ page, context }) => {
    const backend = await installBackend(context);
    await openBoard(page);
    const handle = page.getByRole('button', { name: "Drag ben@example.com's response to another stage" });
    await handle.focus();
    // dnd-kit speaks every step through a live region: wait for each announcement the way a person using a screen reader would. They
    // must say who and which stage, never a raw id (the builder's drag once read out UUIDs).
    const spoken = page.locator('[aria-live]').filter({ hasText: /Picked up|is over|dropped/ }).first();
    await page.keyboard.press('Space');
    // ("Picked up ..." is spoken first and replaced at once by where the card is, so the first stable message is its starting column.)
    await expect(spoken).toContainText('ben@example.com is over New.');
    await page.keyboard.press('ArrowRight');
    await expect(spoken).toContainText('ben@example.com is over In Progress.');
    await page.keyboard.press('ArrowRight');
    await expect(spoken).toContainText('ben@example.com is over Completed.');
    await page.keyboard.press('Space');
    await expect(spoken).toContainText('ben@example.com was dropped on Completed.');

    await expect.poll(() => backend.patches().length).toBe(1);
    expect(backend.patches()[0]).toEqual({ id: 'r2', body: { status: 'completed' } });
    await expect(column(page, 'Completed').getByRole('button', { name: 'Open response from ben@example.com' })).toBeVisible();
  });

  test('Escape cancels a keyboard drag and nothing is saved', async ({ page, context }) => {
    const backend = await installBackend(context);
    await openBoard(page);
    const handle = page.getByRole('button', { name: "Drag asha@example.com's response to another stage" });
    await handle.focus();
    const spoken = page.locator('[aria-live]').filter({ hasText: /is over|dropped|cancelled/ }).first();
    await page.keyboard.press('Space');
    await expect(spoken).toContainText('asha@example.com is over New.');
    await page.keyboard.press('ArrowRight');
    await expect(spoken).toContainText('asha@example.com is over In Progress.');
    await page.keyboard.press('Escape');
    await expect(spoken).toContainText('Moving asha@example.com was cancelled.');
    await page.waitForTimeout(300);
    expect(backend.patches()).toHaveLength(0);
    await expect(column(page, 'New').getByRole('button', { name: 'Open response from asha@example.com' })).toBeVisible();
  });

  test('when the save fails the card goes back to its column and the person is told', async ({ page, context }) => {
    const backend = await installBackend(context, { failPatch: true });
    await openBoard(page);
    const handle = page.getByRole('button', { name: "Drag asha@example.com's response to another stage" });
    await handle.focus();
    const spoken = page.locator('[aria-live]').filter({ hasText: /is over|dropped/ }).first();
    await page.keyboard.press('Space');
    await expect(spoken).toContainText('asha@example.com is over New.');
    await page.keyboard.press('ArrowRight');
    await expect(spoken).toContainText('asha@example.com is over In Progress.');
    await page.keyboard.press('Space');

    await expect.poll(() => backend.patches().length).toBeGreaterThan(0);
    await expect(page.getByText('Failed to update the response. Please try again.').first()).toBeVisible();
    await expect(column(page, 'New').getByRole('button', { name: 'Open response from asha@example.com' })).toBeVisible();
    await expect(column(page, 'In Progress').getByRole('button', { name: 'Open response from asha@example.com' })).toHaveCount(0);
    expect(backend.stageOf('r1')).toBe('new');
  });
});
