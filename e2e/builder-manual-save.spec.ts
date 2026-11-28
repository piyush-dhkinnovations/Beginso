import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * The builder's default: nothing is saved until the person saves. In a real browser: no request while editing, the Save
 * button and Ctrl+S, the warning before leaving, unsaved changes surviving a reload and showing in the preview, and the
 * Auto save setting. The backend is a fake in the test that records every save it receives.
 */
const FORM_ID = 'e2e-manual-form';
const ORIGINAL = 'Original question';

async function installBackend(context: BrowserContext) {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  let label = ORIGINAL;
  let version = 1;
  const saves: string[] = [];
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
      const body = req.postDataJSON() as { fields?: { label: string }[] };
      if (body.fields?.[0]) label = body.fields[0].label;
      saves.push(label);
      version += 1;
      return json(form());
    }
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags/.test(path)) return json([]);
    return json({});
  });
  return { saves };
}

async function openBuilder(page: Page) {
  await page.goto(`/forms/${FORM_ID}/edit`);
  const question = page.getByRole('button', { name: `Select ${ORIGINAL} field` });
  await question.waitFor({ timeout: 60000 });
  await question.click({ position: { x: 90, y: 20 } });
  const input = page.getByRole('textbox', { name: 'Field label' });
  await input.waitFor({ timeout: 30000 });
  return input;
}

/** Types a new label and waits until the builder has taken it in. */
async function rename(page: Page, label: string) {
  await page.getByRole('textbox', { name: 'Field label' }).fill(label);
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
  await page.waitForTimeout(1000);
}

test.describe('builder: saving by hand (the default)', () => {
  test('nothing is sent while editing; the Save button and Ctrl+S send it once', async ({ page, context }) => {
    const backend = await installBackend(context);
    await openBuilder(page);
    await expect(page.getByRole('button', { name: 'Saved' })).toBeDisabled();

    await rename(page, 'First edit');
    await page.waitForTimeout(7000); // longer than auto save would wait
    expect(backend.saves).toEqual([]);

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
    expect(backend.saves).toEqual(['First edit']);

    await rename(page, 'Second edit');
    await page.keyboard.press('Control+s');
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
    expect(backend.saves).toEqual(['First edit', 'Second edit']);
  });

  test('a reload asks first, and the unsaved changes are back afterwards without having been sent', async ({ page, context }) => {
    const backend = await installBackend(context);
    await openBuilder(page);
    await rename(page, 'Not saved yet');

    let prompted = false;
    page.on('dialog', async (d) => {
      prompted = true;
      await d.accept();
    });
    await page.reload();
    await expect(page.getByText('Your unsaved changes are back').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Not saved yet').first()).toBeVisible();
    expect(prompted).toBe(true);
    expect(backend.saves).toEqual([]);

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Your unsaved changes are back')).toHaveCount(0);
    expect(backend.saves).toEqual(['Not saved yet']);
  });

  test('the preview shows the unsaved changes without saving, and they are still there afterwards', async ({ page, context }) => {
    const backend = await installBackend(context);
    await openBuilder(page);
    await rename(page, 'Seen only in preview');

    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByText('Unsaved changes').first()).toBeVisible({ timeout: 30000 });
    await expect(page.frameLocator('iframe[title="Form preview"]').getByText('Seen only in preview')).toBeVisible({ timeout: 30000 });
    expect(backend.saves).toEqual([]);

    await page.getByRole('link', { name: 'Back to editor' }).click();
    await expect(page.getByText('Seen only in preview').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    expect(backend.saves).toEqual([]);
  });

  test('leaving through the menu asks; keep editing stays, discard leaves and forgets', async ({ page, context }) => {
    const backend = await installBackend(context);
    await openBuilder(page);
    await rename(page, 'Will be discarded');

    const home = page.locator('aside a[href="/dashboard"]').first();
    await home.click();
    const dialog = page.getByRole('dialog', { name: 'You have unsaved changes' });
    await dialog.getByRole('button', { name: 'Keep editing' }).click();
    await expect(page).toHaveURL(new RegExp(`/forms/${FORM_ID}/edit`));

    await home.click();
    await dialog.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(backend.saves).toEqual([]);

    await page.goto(`/forms/${FORM_ID}/edit`);
    await expect(page.getByText(ORIGINAL).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Your unsaved changes are back')).toHaveCount(0);
  });

  test('"Save and leave" saves and then goes', async ({ page, context }) => {
    const backend = await installBackend(context);
    await openBuilder(page);
    await rename(page, 'Saved on the way out');
    await page.locator('aside a[href="/dashboard"]').first().click();
    await page.getByRole('button', { name: 'Save and leave' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(backend.saves).toEqual(['Saved on the way out']);
  });

  test('turning Auto save on in Account settings makes the builder save by itself', async ({ page, context }) => {
    const backend = await installBackend(context);
    await page.goto('/settings?tab=builder');
    const toggle = page.getByRole('switch', { name: 'Auto save' });
    await expect(toggle).not.toBeChecked({ timeout: 30000 });
    await toggle.check();

    await openBuilder(page);
    await page.getByRole('textbox', { name: 'Field label' }).fill('Saved by itself');
    await expect.poll(() => backend.saves, { timeout: 15000 }).toEqual(['Saved by itself']);
  });

  test('on a phone the Save button fits beside Undo with no sideways scroll', async ({ page, context }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await installBackend(context);
    await page.goto(`/forms/${FORM_ID}/edit`);
    const save = page.getByRole('button', { name: 'Saved' });
    await save.waitFor({ timeout: 60000 });
    const [s, u, r] = await Promise.all([save, page.getByRole('button', { name: 'Undo' }), page.getByRole('button', { name: 'Redo' })].map((l) => l.boundingBox()));
    expect(s!.x + s!.width).toBeLessThanOrEqual(u!.x + 1);
    expect(r!.x + r!.width).toBeLessThanOrEqual(360);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    const settings = await page.getByRole('tab', { name: 'Settings' }).boundingBox();
    expect(settings!.x + settings!.width).toBeLessThanOrEqual(s!.x + 1); // no tab is cut off behind the button

    // Scrolled far down, Save is still in reach.
    await page.getByRole('button', { name: 'Select Original question field' }).click({ position: { x: 90, y: 20 } });
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(500);
    await expect(save).toBeInViewport();
  });
});

/** The page the person was on before they opened the builder, so Back has somewhere to go. */
async function openBuilderFromSettings(page: Page) {
  await page.goto('/settings');
  await openBuilder(page);
}
const question = (page: Page, label: string) => page.getByRole('button', { name: `Select ${label} field` });
const dialog = (page: Page) => page.getByRole('dialog', { name: 'You have unsaved changes' });

test.describe("builder: the browser's Back button", () => {
  test('asks like the back arrow does; Keep editing stays on the same tab, Discard goes back', async ({ page, context }) => {
    const backend = await installBackend(context);
    await openBuilderFromSettings(page);
    await rename(page, 'Typed but not saved');
    await page.getByRole('tab', { name: 'Branding' }).click();
    await expect(page).toHaveURL(/tab=branding/);

    await page.goBack();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Keep editing' }).click();
    await expect(page).toHaveURL(/\/edit\?tab=branding/);
    await expect(page.getByRole('tab', { name: 'Branding' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();

    await page.goBack();
    await dialog(page).getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/settings/, { timeout: 30000 });
    expect(backend.saves).toEqual([]);
  });

  test('"Save and leave" saves and goes back', async ({ page, context }) => {
    const backend = await installBackend(context);
    await openBuilderFromSettings(page);
    await rename(page, 'Saved by going back');
    await page.goBack();
    await dialog(page).getByRole('button', { name: 'Save and leave' }).click();
    await expect(page).toHaveURL(/\/settings/, { timeout: 30000 });
    expect(backend.saves).toEqual(['Saved by going back']);
  });

  test('once saved, one press leaves without a question', async ({ page, context }) => {
    await installBackend(context);
    await openBuilderFromSettings(page);
    await rename(page, 'Saved first');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/settings/, { timeout: 30000 });
    await expect(dialog(page)).toHaveCount(0);
  });

  test('opened straight from an address, with no page before it, it still asks and then goes to the overview', async ({ page, context }) => {
    await installBackend(context);
    await openBuilder(page);
    await rename(page, 'No page before');
    await page.goBack();
    await dialog(page).getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).not.toHaveURL(/\/edit/, { timeout: 30000 });
  });

  test('going to the preview and back keeps the changes, and the next Back still asks and leaves in one go', async ({ page, context }) => {
    await installBackend(context);
    await openBuilderFromSettings(page);
    await rename(page, 'Through the preview');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page).toHaveURL(/\/preview/, { timeout: 30000 });
    await page.goBack();
    await expect(question(page, 'Through the preview')).toBeVisible({ timeout: 30000 });
    await rename(page, 'Through the preview, again').catch(async () => {
      await question(page, 'Through the preview').click({ position: { x: 90, y: 20 } });
      await rename(page, 'Through the preview, again');
    });
    await page.goBack();
    await dialog(page).getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/settings/, { timeout: 30000 });
  });
});

test.describe('builder: with Auto save on', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => localStorage.setItem('beginso.builderAutoSave', 'on'));
  });

  test('it saves by itself a few seconds after the last change, and says so', async ({ page, context }) => {
    const backend = await installBackend(context);
    await openBuilder(page);
    await rename(page, 'Saved on its own');
    await expect(page.getByText('Auto save on · saving in a moment').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Auto save on · All changes saved').first()).toBeVisible();
    expect(backend.saves).toEqual(['Saved on its own']);
  });

  for (const [way, leave] of [
    ["the browser's Back button", (page: Page) => page.goBack()],
    ['a menu link', (page: Page) => page.locator('aside a[href="/dashboard"]').first().click()],
  ] as const) {
    test(`leaving by ${way} straight after a change saves it and goes, with no question`, async ({ page, context }) => {
      const backend = await installBackend(context);
      await openBuilderFromSettings(page);
      await rename(page, 'Saved on the way out');
      await leave(page);
      await expect(page).not.toHaveURL(/\/edit/, { timeout: 30000 });
      await expect(dialog(page)).toHaveCount(0);
      expect(backend.saves).toEqual(['Saved on the way out']);
    });
  }
});
