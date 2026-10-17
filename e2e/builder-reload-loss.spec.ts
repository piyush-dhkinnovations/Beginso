import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * QA D3-001: text typed in the builder in the last moments before a reload, a typed URL or a closed tab was lost, while the
 * header said "All changes saved" and no leave prompt appeared. These specs use a REAL browser, a real reload, a real tab
 * close and real offline mode. The backend is a fake that lives in the test: it records every PATCH it receives, so "was the
 * edit saved" is read from what the server was actually sent, never from the page's own claim.
 *
 * Each case types, acts within a fraction of a second (well inside the 600 ms input debounce and the 2 s autosave), then
 * checks the server's copy of the label.
 */
const FORM_ID = 'e2e-form-1';
const ORIGINAL = 'Original question';

interface FakeBackend {
  label: () => string;
  patches: () => number;
}

async function installBackend(context: BrowserContext, opts: { failPatch?: () => boolean } = {}): Promise<FakeBackend> {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  let label = ORIGINAL;
  let version = 1;
  let patches = 0;
  const form = () => ({
    _id: FORM_ID, workspaceId: null, title: 'E2E form', description: '', status: 'draft', schemaVersion: 1, responseCount: 0,
    contentVersion: version, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    pages: [{ id: 'p1', order: 0, title: 'E2E form' }], branding: {}, settings: { honeypotEnabled: true },
    fields: [{ fieldId: 'f1', pageId: 'p1', label, type: 'short_text', required: false, deleted: false, order: 0 }],
  });
  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === `api/forms/${FORM_ID}` && req.method() === 'GET') return json(form());
    if (path === `api/forms/${FORM_ID}` && req.method() === 'PATCH') {
      patches += 1;
      if (opts.failPatch?.()) return json({ message: 'boom' }, 500);
      const body = req.postDataJSON() as { fields?: { label: string }[] };
      if (body.fields?.[0]) label = body.fields[0].label;
      version += 1;
      return json(form());
    }
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags/.test(path)) return json([]);
    return json({});
  });
  return { label: () => label, patches: () => patches };
}

async function openBuilder(page: Page, formId = FORM_ID) {
  await page.goto(`/forms/${formId}/edit`);
  await page.getByText(ORIGINAL, { exact: false }).first().waitFor({ timeout: 60000 });
  // Select the field and find its label input.
  await page.getByText(ORIGINAL, { exact: false }).first().click();
  const input = page.getByRole('textbox', { name: 'Field label' });
  await input.waitFor({ timeout: 30000 });
  return input;
}

test.describe('builder: typed text survives leaving the page', () => {
  test('typing then a reload 250 ms later keeps the edit, or asks first', async ({ page, context }) => {
    const backend = await installBackend(context);
    const input = await openBuilder(page);
    let prompted = false;
    page.on('dialog', async (d) => {
      prompted = true;
      await d.accept(); // "Leave anyway": the edit must STILL reach the server
    });
    await input.fill('Edited right before reload');
    await page.waitForTimeout(250);
    await page.reload();
    await expect.poll(backend.label, { timeout: 15000 }).toBe('Edited right before reload');
    expect(prompted || backend.label() === 'Edited right before reload').toBe(true);
  });

  test('the header never says "All changes saved" while text is typed but not yet committed', async ({ page, context }) => {
    await installBackend(context);
    const input = await openBuilder(page);
    await input.fill('Typing, not committed');
    // Inside the 600 ms debounce window.
    await expect(page.getByText('Unsaved changes').first()).toBeVisible({ timeout: 400 });
    await expect(page.getByText('All changes saved')).toHaveCount(0);
  });

  // This case talks to the mock backend over real HTTP (through the app's own proxy) instead of Playwright's route hooks: a request
  // that a closing page sends never reaches those hooks, but it does reach a real server, which is what a user's save needs.
  test('closing the tab right after typing prompts, and accepting still saves the edit', async ({ context }) => {
    const formId = 'e2e-close-tab-form';
    await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
    const page = await context.newPage();
    const input = await openBuilder(page, formId);
    const serverLabel = async () => (await (await fetch(`http://localhost:3101/__e2e/forms/${formId}/label`)).text());
    let prompted = false;
    page.on('dialog', async (d) => {
      prompted = true;
      await d.accept();
    });
    await input.fill('Edited right before closing');
    await page.waitForTimeout(250);
    await page.close({ runBeforeUnload: true });
    await expect.poll(serverLabel, { timeout: 15000 }).toBe('Edited right before closing');
    expect(prompted).toBe(true);
  });

  test('typing then going offline then reloading: the page warns, and nothing is claimed as saved', async ({ page, context }) => {
    let offline = false;
    const backend = await installBackend(context, { failPatch: () => offline });
    const input = await openBuilder(page);
    await input.fill('Typed while the connection drops');
    offline = true; // the server stops accepting saves, like a dropped connection
    await context.setOffline(true);
    let prompted = false;
    page.on('dialog', async (d) => {
      prompted = true;
      await d.dismiss(); // "Stay"
    });
    await page.waitForTimeout(3000); // autosave tries and fails
    await expect(page.getByText(/Save failed|Unsaved changes/).first()).toBeVisible();
    await expect(page.getByText('All changes saved')).toHaveCount(0);
    // Reload from inside the page: Playwright's own reload() waits for a navigation that "Stay" cancels, and would just hang.
    void page.evaluate(() => window.location.reload());
    await page.waitForTimeout(1500);
    expect(prompted).toBe(true); // the page asked before throwing the edit away
    expect(backend.label()).toBe(ORIGINAL); // and the server really does not have it
    await context.setOffline(false);
  });

  test('a save that fails says why', async ({ page, context }) => {
    await installBackend(context, { failPatch: () => true });
    const input = await openBuilder(page);
    await input.fill('This save will fail');
    await expect(page.getByText(/Beginso had a problem saving \(error 500\)/).first()).toBeVisible({ timeout: 15000 });
  });
});
