import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * Every respondent avatar in the Responses table was the same pale blue. Each person now gets a colour of their own, stable per name.
 * Real browser, real CSS: the discs must differ from one another and the initials must stay readable (4.5:1) in light and dark.
 */
const FORM_ID = 'e2e-avatar-form';
const PEOPLE = ['harsh.vora@example.com', 'gerald.gray@example.com', 'ratin.mehta@example.com', 'afzal.shaikh@example.com', 'jayesh.patel@example.com', 'piyush.prajapat@example.com', 'vinod.umrao@example.com', 'mukul.gupta@example.com'];

async function installBackend(context: BrowserContext) {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  const rows = PEOPLE.map((email, i) => ({
    _id: `r${i}`, formId: FORM_ID, reference: `#${i + 1}`, answers: {}, respondentEmail: email, assignee: null, tags: [], unread: i % 2 === 0,
    stage: { id: 'new', name: 'New', colour: 'neutral', category: 'new' },
    submittedAt: '2026-10-16T10:00:00.000Z', createdAt: '2026-10-16T10:00:00.000Z', updatedAt: '2026-10-16T10:00:00.000Z',
  }));
  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === 'api/responses' && req.method() === 'GET') return json({ success: true, data: rows, total: rows.length, page: 1, limit: 50, totalPages: 1 });
    if (path === 'api/responses/stats') return json({ total: rows.length, unread: 4 });
    if (path === `api/forms/${FORM_ID}`) return json({ _id: FORM_ID, title: 'Avatar form', fields: [], pages: [], status: 'published', workspaceId: null });
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags|views/.test(path)) return json([]);
    return json({});
  });
}

// WCAG contrast between two computed rgb() colours.
const contrast = (a: string, b: string) => {
  const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const lum = ([r, g, bl]: number[]) => {
    const lin = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  };
  const [hi, lo] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

async function discs(page: Page) {
  return page.locator('.bg-avatar[data-tone="auto"]').evaluateAll((els) =>
    els.map((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, fg: s.color, text: el.textContent ?? '' };
    })
  );
}

for (const scheme of ['light', 'dark'] as const) {
  test(`respondent avatars are different colours and readable in ${scheme} mode`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
    await installBackend(context);
    const page = await context.newPage();
    await page.goto(`/forms/${FORM_ID}/inbox`);
    await expect(page.getByText('harsh.vora@example.com').first()).toBeVisible({ timeout: 60000 });
    if (scheme === 'dark') await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

    const found = await discs(page);
    expect(found.length).toBe(PEOPLE.length);
    // Not one colour for everybody.
    expect(new Set(found.map((d) => d.bg)).size).toBeGreaterThanOrEqual(5);
    // Every set of initials is readable on its own disc.
    for (const d of found) expect(contrast(d.bg, d.fg), `${d.text} on ${d.bg}`).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({ path: `test-results/respondent-avatars-${scheme}.png`, clip: { x: 0, y: 150, width: 900, height: 600 } });
    await context.close();
  });
}
