import { test, expect } from '@playwright/test';

/**
 * Real-browser checks for two keyboard accessibility fixes (QA A13-011, A3-006). The builder is the one page that always shows the
 * collapsed icon rail, so it is where the rail tooltip is exercised. Backend calls are answered inside the test.
 */
const FORM_ID = 'e2e-form-a11y';

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const form = {
    _id: FORM_ID, workspaceId: null, title: 'E2E form', description: '', status: 'draft', schemaVersion: 1, responseCount: 0, contentVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', pages: [{ id: 'p1', order: 0, title: 'E2E form' }],
    branding: {}, settings: { honeypotEnabled: true },
    fields: [{ fieldId: 'f1', pageId: 'p1', label: 'Original question', type: 'short_text', required: false, deleted: false, order: 0 }],
  };
  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (p === 'api/auth/me') return json({ success: true, user: { id: 'u', name: 'E2E', email: 'e@e.com', onboardingCompleted: true } });
    if (p === `api/forms/${FORM_ID}`) return json(form);
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags/.test(p)) return json([]);
    return json({});
  });
});

test('the skip link is the first thing Tab reaches, shows itself, and moves focus to the main region', async ({ page }) => {
  await page.goto(`/forms/${FORM_ID}/edit`);
  await page.getByText('Original question').first().waitFor({ timeout: 60000 });
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  const box = (await skip.boundingBox())!;
  expect(box.width).toBeGreaterThan(40); // visible when focused, not a 1px sr-only box
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('main-content');
});

test('a rail icon shows its label on keyboard focus, fully on screen, and Esc hides it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/forms/${FORM_ID}/edit`);
  await page.getByText('Original question').first().waitFor({ timeout: 60000 });
  const railLink = page.locator('nav[aria-label="Primary"] a[aria-label]').first();
  await railLink.waitFor();
  const label = (await railLink.getAttribute('aria-label'))!;
  await railLink.focus();
  const tip = page.locator('[role=tooltip]');
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(label);
  const t = (await tip.boundingBox())!;
  const l = (await railLink.boundingBox())!;
  expect(t.x).toBeGreaterThanOrEqual(l.x + l.width); // to the right of the icon, not hidden behind the rail's own edge
  expect(t.x + t.width).toBeLessThanOrEqual(1440);
  expect(t.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Escape');
  await expect(tip).toHaveCount(0);
});

test('the same label shows on mouse hover', async ({ page }) => {
  await page.goto(`/forms/${FORM_ID}/edit`);
  await page.getByText('Original question').first().waitFor({ timeout: 60000 });
  const railLink = page.locator('nav[aria-label="Primary"] a[aria-label]').first();
  const label = (await railLink.getAttribute('aria-label'))!;
  await railLink.hover();
  await expect(page.locator('[role=tooltip]')).toHaveText(label);
});
