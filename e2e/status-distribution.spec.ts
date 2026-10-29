import { test, expect } from '@playwright/test';

/**
 * The Status Distribution card on Insights: a donut with the total in the middle and one row for every stage of the form (a stage nobody is in
 * yet shows 0), and a card that has no empty lower half next to the trend chart. The backend is faked; the stages are the form's own.
 */
const FORM_ID = 'e2e-status-form';
const STAGES = [
  { id: 's-new', name: 'New', colour: 'neutral', category: 'new', order: 0, isDefault: true },
  { id: 's-review', name: 'In Review', colour: 'warning', category: 'in_progress', order: 1, isDefault: false },
  { id: 's-hold', name: 'On Hold', colour: 'info', category: 'in_progress', order: 2, isDefault: false },
  { id: 's-done', name: 'Released', colour: 'success', category: 'completed', order: 3, isDefault: false },
];

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'u', name: 'E2E User', email: 'e@e.com', onboardingCompleted: true } });
    if (path === `api/forms/${FORM_ID}`) {
      return json({
        _id: FORM_ID, workspaceId: null, title: 'Film submissions', description: '', status: 'published', schemaVersion: 1, responseCount: 90, contentVersion: 1,
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', pages: [{ id: 'p1', order: 0, title: 'Page' }], branding: {}, settings: {}, fields: [],
      });
    }
    if (path === `api/forms/${FORM_ID}/response-setup`) return json({ version: 1, stages: { mode: 'own', list: STAGES, startIndex: 0 } });
    if (path === 'api/analytics/overview') {
      return json({
        success: true,
        data: {
          total: 90, new: 30, in_progress: 40, completed: 20, completionRate: 22, views: 300,
          stageDistribution: [
            { stageId: 's-new', name: 'New', category: 'new', count: 30 },
            { stageId: 's-review', name: 'In Review', category: 'in_progress', count: 40 },
            { stageId: 's-done', name: 'Released', category: 'completed', count: 20 },
          ],
        },
      });
    }
    if (path === 'api/analytics/trends') {
      const points = Array.from({ length: 14 }, (_, i) => ({ bucketStart: new Date(Date.UTC(2026, 9, 1 + i)).toISOString(), responses: 3 + ((i * 5) % 9) }));
      return json({ success: true, points, dateRange: { bucket: 'day' } });
    }
    if (path === 'api/analytics/questions') return json({ success: true, data: { questions: [] } });
    if (path === `api/forms/${FORM_ID}/charts`) return json({ success: true, charts: [] });
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags|views|activity/.test(path)) return json([]);
    return json({});
  });
});

test('lists every stage (an empty one at 0) in a donut card that fills its place beside the trend chart', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/forms/${FORM_ID}/insights`);
  const card = page.locator('h3', { hasText: 'Status Distribution' }).locator('xpath=ancestor::div[contains(@class,"bg-card")][1]');
  await expect(card).toBeVisible({ timeout: 60000 });

  // the donut, with the total in the middle
  await expect(card.getByRole('img', { name: /Status distribution: 30 new, 40 in review, 0 on hold, 20 released/ })).toBeVisible();
  await expect(card.getByRole('img')).toContainText('90');
  // every stage of the form is a row, in the order of the pipeline; the one nobody is in shows 0
  for (const name of ['New', 'In Review', 'On Hold', 'Released']) await expect(card.getByText(name, { exact: true }).first()).toBeVisible();
  await expect(card.getByText('0.0%').first()).toBeVisible();

  // no blank lower half: the content reaches the lower part of the card
  const box = (await card.boundingBox())!;
  const last = (await card.getByText('Released', { exact: true }).first().boundingBox())!;
  expect(box.y + box.height - (last.y + last.height), 'space under the last row').toBeLessThan(box.height * 0.3);
  // and the card is no taller than the chart row it sits in
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('status-distribution.png') });
});
