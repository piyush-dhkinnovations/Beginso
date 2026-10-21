import { test, expect } from '@playwright/test';

/**
 * QA A12-004 / A4b-007: the category chip on a template card ("Advanced", "Feedback") was half hidden behind the preview picture,
 * which is drawn after it. Real browser: each chip must have its own stacking order above the picture.
 */
const field = (i: number, label: string, type = 'short_text') => ({ fieldId: `f${i}`, pageId: 'p1', label, type, required: false, deleted: false, order: i });
const template = (id: string, name: string, category: string) => ({
  _id: id, name, description: `${name} template`, category, fields: [field(0, 'Name'), field(1, 'Email', 'email'), field(2, 'Rating', 'rating'), field(3, 'Comment', 'long_text')],
  pages: [{ id: 'p1', order: 0, title: name }], settings: {}, isActive: true, source: 'beginso',
});

test('template category chips sit on top of the preview picture', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  await context.route('**/api/backend/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === 'api/templates') return json({ templates: [template('t1', 'Pitch Plan', 'advanced'), template('t2', 'Customer Survey', 'feedback'), template('t3', 'Event Registration', 'events')] });
    if (/workspaces|notifications|members|stages|tags/.test(path)) return json([]);
    return json({});
  });
  const page = await context.newPage();
  await page.goto('/templates');
  await expect(page.getByText('Pitch Plan').first()).toBeVisible({ timeout: 60000 });
  for (const category of ['Advanced', 'Feedback', 'Events']) {
    const chip = page.locator('span.absolute.left-3.top-3', { hasText: category }).first();
    await expect(chip).toBeVisible();
    // elementFromPoint cannot be used here (the picture is pointer-events:none, so hit-testing skips it). What decides who is painted on
    // top is stacking order: the chip is positioned, so it needs an explicit z-index above the picture that comes after it in the page.
    const z = await chip.evaluate((el) => getComputedStyle(el).zIndex);
    expect(Number(z), `${category} chip has no z-index, so the picture paints over it`).toBeGreaterThanOrEqual(1);
  }
  await context.close();
});
