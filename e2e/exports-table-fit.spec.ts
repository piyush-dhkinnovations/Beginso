import { test, expect } from '@playwright/test';

/** QA A14-003 / A12-002: the Download / Unavailable action in the Exports table was cut off ("Dow") and the table scrolled sideways. */
const job = (i: number, status: 'completed' | 'failed') => ({
  id: `r${i}`, format: i % 2 ? 'pdf' : 'csv', status, formId: 'f1', formTitle: 'Customer feedback survey for the autumn programme',
  createdAt: '2026-10-16T17:42:00.000Z', completedAt: '2026-10-16T17:43:00.000Z', expiresAt: '2026-10-30T17:43:00.000Z', from: '2026-09-17T00:00:00.000Z', to: '2026-10-16T00:00:00.000Z',
});

for (const width of [768, 1024, 1440]) {
  test(`exports show the whole action button at ${width}px (table when wide, cards when narrow)`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
    await context.route('**/api/backend/**', async (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api/backend/', '');
      const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
      if (path === 'api/reports') return json({ success: true, data: [job(1, 'completed'), job(2, 'completed'), job(3, 'failed')], total: 3, page: 1, limit: 20, totalPages: 1 });
      if (path === 'api/forms') return json({ forms: [], total: 0, page: 1, limit: 50 });
      if (/workspaces|notifications|members|stages|tags/.test(path)) return json([]);
      return json({});
    });
    const page = await context.newPage();
    await page.goto('/exports');
    const download = page.getByRole('button', { name: /Download/ }).first();
    await expect(download).toBeVisible({ timeout: 60000 });
    if (width >= 1280) {
      // Wide screens: the table, which must fit its card with the whole action button inside it.
      const table = page.locator('table').first();
      await expect(table).toBeVisible();
      const wrap = table.locator('xpath=..');
      const { scroll, client } = await wrap.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
      expect(scroll, 'the exports table is wider than its card').toBeLessThanOrEqual(client);
      const box = await download.boundingBox();
      const wrapBox = await wrap.boundingBox();
      expect(box && wrapBox && box.x + box.width <= wrapBox.x + wrapBox.width + 1, 'Download button is cut off').toBe(true);
    } else {
      // Narrower than 1280 the card beside the sidebar is too small for five columns: exports are listed as cards, with nothing clipped.
      await expect(page.locator('table').first()).toBeHidden();
      const box = await download.boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= width, 'Download button is cut off').toBe(true);
    }
    await context.close();
  });
}
