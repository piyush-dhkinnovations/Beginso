import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * A form that chose its own typeface (Lora, a serif, in the Split Feature layout) is set in it from the title down: the title, the page
 * heading, every label, the step text and the buttons, not only the inputs, which inherit the font. Checked on the public form
 * (/f/own-font on the mock server) and on the builder's preview of a layout (/forms/:id/preview?embed=1&layout=split_feature), which is the
 * screen where only the inputs once changed.
 */
const family = (el: Locator) => el.evaluate((node) => getComputedStyle(node).fontFamily);

async function expectAllSerif(page: Page, parts: [string, Locator][], input: Locator) {
  const inputFamily = await family(input);
  expect(inputFamily, 'the inputs are set in Lora').toMatch(/lora/i);
  for (const [what, el] of parts) {
    const found = await family(el);
    expect(found, `${what} is set in Lora`).toMatch(/lora/i);
    expect(found, `${what} is not DM Sans`).not.toMatch(/dm.?sans/i);
  }
}

test('public form: the title, the labels, the step text and the buttons use the form\'s typeface, not only the inputs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/f/own-font');
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible({ timeout: 60000 });
  await expectAllSerif(
    page,
    [
      ['the page heading', page.getByRole('heading', { name: 'About you' })],
      ['the form title', page.getByText('Serif form', { exact: true }).first()],
      ['a label', page.locator('label', { hasText: 'Full name' })],
      ['the step text', page.getByText('Step 1 of 2')],
      ['the button', page.getByRole('button', { name: /next/i })],
    ],
    page.getByLabel('Full name', { exact: false }),
  );
  await page.screenshot({ path: test.info().outputPath('own-font-public.png') });
});

test('builder preview of the Split Feature layout: the title and the labels use the layout\'s typeface too', async ({ page, context }) => {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const field = (fieldId: string, type: string, label: string, order: number) => ({ fieldId, pageId: 'p1', type, label, order, required: false, deleted: false });
  await context.route('**/api/backend/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'u', name: 'E2E', email: 'e@e.com', onboardingCompleted: true } });
    if (path === 'api/forms/font-form') {
      return json({
        _id: 'font-form', workspaceId: null, title: 'GitHub Text Form', description: '', status: 'published', schemaVersion: 1, responseCount: 0, contentVersion: 1,
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', slug: 'font-form',
        pages: [{ id: 'p1', order: 0, title: 'Page' }], branding: {}, settings: { honeypotEnabled: true },
        fields: [field('f1', 'short_text', 'Short Text', 0), field('f2', 'long_text', 'Long Text', 1), field('f3', 'email', 'Email', 2)],
      });
    }
    if (/workspaces|notifications|members|stages|tags/.test(path)) return json([]);
    return json({});
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/forms/font-form/preview?embed=1&layout=split_feature');
  await expect(page.getByText('Short Text', { exact: true })).toBeVisible({ timeout: 60000 });
  await expectAllSerif(
    page,
    [
      ['the form title', page.getByText('GitHub Text Form', { exact: true }).first()],
      ['a label', page.locator('label', { hasText: 'Short Text' })],
      ['another label', page.locator('label', { hasText: 'Email' })],
    ],
    page.getByLabel('Short Text', { exact: false }),
  );
  await page.screenshot({ path: test.info().outputPath('own-font-preview.png') });
});
