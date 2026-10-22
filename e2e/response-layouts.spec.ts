import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * Sprint 15: the "Submitted response" card in three layouts (Grid, List, Table), in the drawer and on the full-screen page.
 * Real browser; the backend is a fake that lives in this file and remembers the layout it is sent, so a reload and a second tab
 * really read the saved choice back. The response is a 39-question film submission (invented names and links) with three
 * unanswered questions, a long synopsis and two Drive links.
 */
const FORM_ID = 'e2e-layout-form';
const RESPONSE_ID = 'r1';
const QUESTIONS: [label: string, type: string, answer: string | null][] = [
  ['Email address', 'email', 'asha.rao@example.com'],
  ['Categories', 'dropdown', 'Shortfilm'],
  ['Content Title', 'short_text', 'Night Train'],
  ['Name of Director', 'short_text', 'Asha Rao'],
  ['Name of Producers', 'short_text', 'Meera Nair And Asha Rao'],
  ['Year of Production', 'number', '2026'],
  ['Language', 'short_text', 'Gujarati'],
  ['Genre', 'dropdown', 'Drama'],
  ['Is there any drug abuse or alcohol consumption', 'multiple_choice', 'No'],
  ['Does your film have subtitles', 'multiple_choice', 'Yes'],
  ['Provide actors name', 'long_text', 'CAST\nRiya Patel, Kabir Shah, Neha Iyer, Dev Anand Rao'],
  ['Is this an adult content', 'multiple_choice', 'No'],
  ['Is there any violence in the film', 'multiple_choice', 'No'],
  ['Accolades or awards won', 'short_text', 'No'],
  ['Is this film censored', 'multiple_choice', 'No'],
  ['Do you have a clean copy of the trailer and the film without any watermark or logo on the frame', 'multiple_choice', 'Yes'],
  ['Trailer link', 'url', 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=drivesdk'],
  ['Full length video link', 'url', 'https://drive.google.com/file/d/16-ZyXwVuTsRqPoNm/view?usp=drivesdk'],
  ['Full film password', 'short_text', 'No'],
  ['Production house name', 'short_text', 'Blue Door Films'],
  ['Your name', 'short_text', 'Asha Rao'],
  ['Contact number', 'phone', '9800000001'],
  ['Address', 'address', 'Flat 4, Lake View Road\nPune\nMaharashtra India'],
  ['Duration of your film in minutes', 'number', '15'],
  ['Status of the film', 'dropdown', 'Unreleased'],
  ['Youtube views', 'short_text', 'Unreleased'],
  ['Upload your film poster', 'url', 'https://example.com/poster.png'],
  ['One line synopsis', 'short_text', 'The film questions the mindset of "It is not my problem"'],
  ['Synopsis in detail', 'long_text', Array.from({ length: 14 }, (_, i) => `Line ${i + 1} of the synopsis, written the way a real submission runs on.`).join('\n')],
  ['Keywords for your film', 'short_text', '#shortfilm #gujarati'],
  ['Can we publish your film on other OTT platforms', 'multiple_choice', 'Yes'],
  ['Is your content already available on another platform', 'multiple_choice', 'No'],
  ['Instagram page link', 'url', 'https://www.instagram.com/asha.rao.films'],
  ['Facebook page link', 'url', 'https://www.facebook.com/asha.rao.films'],
  ['Twitter page link', 'url', null],
  ['How did you know about us', 'dropdown', 'Google'],
  ['If any queries', 'long_text', 'I want to release this short film on big platforms.'],
  ['Status', 'short_text', null],
  ['KC comments', 'long_text', null],
];
const SYSTEM_VIEW = { layout: 'grid', density: 'comfortable', showEmpty: true, showNumbers: true };

interface Fake {
  puts: () => Record<string, unknown>[];
  detailGets: () => number;
  reports: () => Record<string, unknown>[];
}

async function installBackend(context: BrowserContext, opts: { stress?: boolean } = {}): Promise<Fake> {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  let personal: Record<string, unknown> | null = null;
  const puts: Record<string, unknown>[] = [];
  let detailGets = 0;
  const reports: Record<string, unknown>[] = [];

  const fields = QUESTIONS.map(([label, type], i) => ({
    fieldId: `f${i + 1}`, pageId: 'p1', label, type, required: false, deleted: false, order: i, options: [],
    ...(label === 'Upload your film poster' ? { urlPreviewPosition: 'top' } : {}),
  }));
  const form = {
    _id: FORM_ID, workspaceId: null, title: 'Film submissions', description: '', status: 'published', schemaVersion: 1, responseCount: 2,
    contentVersion: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    pages: [{ id: 'p1', order: 0, title: 'Film submissions' }], branding: {}, settings: {}, fields,
  };
  const answers: Record<string, unknown> = Object.fromEntries(QUESTIONS.filter(([, , a]) => a !== null).map(([label, , a]) => [label, a]));
  if (opts.stress) {
    answers['If any queries'] = 'x'.repeat(5000);
    answers['Content Title'] = 'https://example.com/' + 'a'.repeat(300);
  }
  const base = (id: string, email: string) => ({
    _id: id, formId: FORM_ID, reference: `#${id}`, answers, respondentEmail: email, assignee: null, tags: [], unread: false, noteCount: 0,
    duplicateOfId: null, ipHash: 'a1b2c3d4e5f60718', status: 'new',
    stage: { id: 'new', name: 'New', colour: 'neutral', category: 'new' },
    submittedAt: '2026-10-04T18:24:00.000Z', createdAt: '2026-10-04T18:24:00.000Z', updatedAt: '2026-10-04T18:24:00.000Z',
  });

  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/backend/', '');
    const json = (body: unknown, code = 200) => route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(body) });

    if (path === 'api/auth/me') return json({ success: true, user: { id: 'e2e-user', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === `api/forms/${FORM_ID}`) return json(form);
    if (path === `api/forms/${FORM_ID}/response-view`) {
      return json({
        success: true,
        resolved: { ...(personal ?? SYSTEM_VIEW), source: personal ? 'personal' : 'system' },
        formDefault: null,
        personal: personal ? { ...personal, scope: FORM_ID } : null,
        personalAll: null,
        dropped: [],
      });
    }
    if (path === 'api/me/response-view' && req.method() === 'PUT') {
      const { scope: _scope, ...settings } = req.postDataJSON() as Record<string, unknown>;
      personal = settings;
      puts.push(settings);
      return json({ success: true, personal: { ...settings, scope: FORM_ID } });
    }
    if (path === `api/responses/${RESPONSE_ID}` && req.method() === 'GET') {
      detailGets += 1;
      return json({ success: true, response: { ...base(RESPONSE_ID, 'asha@example.com'), response_files: [] } });
    }
    if (path === 'api/responses' && req.method() === 'GET') {
      const rows = [base(RESPONSE_ID, 'asha@example.com'), base('r2', 'ben@example.com')];
      return json({ success: true, data: rows, total: rows.length, page: 1, limit: 20, totalPages: 1 });
    }
    if (path === 'api/reports' && req.method() === 'POST') {
      const body = req.postDataJSON() as Record<string, unknown>;
      reports.push(body);
      return json({ success: true, report: { _id: 'rep1', format: body.format, status: 'pending', createdAt: '2026-10-21T10:00:00.000Z' } });
    }
    if (path === 'api/responses/stats') return json({ total: 2, unread: 0 });
    if (path.startsWith('api/responses/') && path.endsWith('/activity')) return json({ success: true, activity: [] });
    if (path.startsWith('api/responses/') && path.endsWith('/notes')) return json({ success: true, notes: [] });
    if (path.startsWith('api/forms/') && path.endsWith('/grants')) return json([]);
    if (req.method() === 'GET' && /workspaces|notifications|members|stages|tags|views|link-preview/.test(path)) return json([]);
    return json({});
  });
  return { puts: () => puts, detailGets: () => detailGets, reports: () => reports };
}

const drawerUrl = `/forms/${FORM_ID}/inbox?responseId=${RESPONSE_ID}`;
const pageUrl = `/inbox/${RESPONSE_ID}?formId=${FORM_ID}&returnTo=${encodeURIComponent(`/forms/${FORM_ID}/inbox?responseId=${RESPONSE_ID}`)}`;
const card = (page: Page) => page.getByRole('region', { name: 'Submitted response' });
const layoutOf = (page: Page) => card(page).getAttribute('data-layout');

async function openDrawer(page: Page) {
  await page.goto(drawerUrl);
  await expect(card(page)).toBeVisible({ timeout: 60000 });
  await expect(card(page)).toContainText('Night Train', { timeout: 30000 });
}

/** Every one of the 39 questions is on screen, numbered, and the answered ones show their answer. */
async function expectEveryQuestion(page: Page) {
  const text = (await card(page).textContent()) ?? '';
  QUESTIONS.forEach(([label], i) => expect(text, `question ${i + 1} (${label})`).toContain(`${i + 1}. ${label}`));
  for (const answer of ['Night Train', 'Blue Door Films', 'asha.rao@example.com', 'Maharashtra India', 'Line 14 of the synopsis']) expect(text).toContain(answer);
}

test.describe('Submitted response layouts', () => {
  test('Grid, List and Table each show every answer, and the choice survives a reload and a new tab', async ({ page, context }, testInfo) => {
    const fake = await installBackend(context);
    await openDrawer(page);

    expect(await layoutOf(page)).toBe('grid');
    await expectEveryQuestion(page);
    await page.screenshot({ path: testInfo.outputPath('drawer-grid.png') });

    const detailBefore = fake.detailGets();
    await page.getByRole('radio', { name: 'List' }).click();
    await expect(card(page)).toHaveAttribute('data-layout', 'list');
    await expectEveryQuestion(page);
    await expect(card(page).getByRole('table')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('drawer-list.png') });

    await page.getByRole('radio', { name: 'Table' }).click();
    await expect(card(page)).toHaveAttribute('data-layout', 'table');
    await expectEveryQuestion(page);
    await expect(card(page).getByRole('row')).toHaveCount(QUESTIONS.length + 1); // plus the Question / Answer header row
    await page.screenshot({ path: testInfo.outputPath('drawer-table.png') });

    // Switching never refetched the response, and was saved (debounced).
    expect(fake.detailGets()).toBe(detailBefore);
    // The save is debounced, so a pause after "List" (a screenshot, a slow runner) can let a save for "List" go out first: wait for the LAST
    // save to be the final choice, instead of for any save.
    await expect.poll(() => fake.puts().at(-1)?.layout, { timeout: 5000 }).toBe('table');

    await page.reload();
    await expect(card(page)).toHaveAttribute('data-layout', 'table', { timeout: 30000 });

    const second = await context.newPage();
    await second.goto(drawerUrl);
    await expect(card(second)).toHaveAttribute('data-layout', 'table', { timeout: 60000 });
    await expectEveryQuestion(second);
  });

  test('switching a layout is fast on the 39-question response', async ({ page, context }) => {
    await installBackend(context);
    await openDrawer(page);
    // The e2e app is a dev server (unminified React, no production optimisations), so the first switches are measured as a
    // warm-up and the budget is checked on the median of the rest: a production build is faster still.
    const durations = await page.evaluate(async () => {
      const region = document.querySelector('section[aria-label="Submitted response"]')!;
      const out: number[] = [];
      for (const name of ['List', 'Table', 'Grid', 'List', 'Table', 'Grid', 'List', 'Table', 'Grid', 'List', 'Table', 'Grid', 'List', 'Table', 'Grid']) {
        const radio = [...document.querySelectorAll<HTMLElement>('[role=radio]')].find((r) => r.textContent?.trim() === name)!;
        const start = performance.now();
        radio.click();
        // The attribute is set by React's next commit; wait for it, not for a timer.
        while (region.getAttribute('data-layout') !== name.toLowerCase()) await new Promise((r) => setTimeout(r, 0));
        out.push(performance.now() - start);
      }
      return out;
    });
    const warm = durations.slice(3).sort((a, b) => a - b);
    const median = warm[Math.floor(warm.length / 2)];
    test.info().annotations.push({ type: 'switch-ms', description: durations.map((d) => d.toFixed(0)).join(', ') });
    // 100 ms is the product target (a production build); a shared CI runner on the dev server gets 2x headroom so the test catches a
    // real regression (hundreds of ms) rather than runner noise.
    expect(median, 'median switch time in ms').toBeLessThan(200);
  });

  test('the switcher is a radio group that works with the arrow keys and announces the change', async ({ page, context }) => {
    await installBackend(context);
    await openDrawer(page);
    const group = page.getByRole('radiogroup', { name: 'Layout' });
    await expect(group.getByRole('radio')).toHaveCount(3);
    await group.getByRole('radio', { name: 'Grid' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: 'List' })).toBeFocused();
    await expect(group.getByRole('radio', { name: 'List' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('status').filter({ hasText: 'Layout: List' })).toHaveCount(1);
    await expect(card(page)).toHaveAttribute('data-layout', 'list');
  });

  test('the drawer traps focus, and Escape closes it and returns focus to the row', async ({ page, context }) => {
    await installBackend(context);
    await page.goto(`/forms/${FORM_ID}/inbox`);
    const row = page.getByRole('button', { name: /^Open response from/ }).first();
    await expect(row).toBeVisible({ timeout: 60000 });
    await row.click();
    const dialog = page.getByRole('dialog');
    await expect(card(page)).toBeVisible({ timeout: 30000 });
    await expect(card(page)).toContainText('Night Train');

    const inside = () => page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'));
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Tab');
      expect(await inside(), `Tab ${i + 1} stays inside the drawer`).toBe(true);
    }
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await inside(), `Shift+Tab ${i + 1} stays inside the drawer`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(row).toBeFocused();
  });

  test('Download asks for CSV or PDF, and asks for the one chosen', async ({ page, context }, testInfo) => {
    const fake = await installBackend(context);
    await openDrawer(page);
    await page.getByRole('button', { name: 'Download response' }).click();
    const menu = page.getByRole('menu', { name: 'Download response' });
    await expect(menu.getByRole('menuitem')).toHaveText(['Download as CSV', 'Download as PDF']);
    await menu.screenshot({ path: testInfo.outputPath('download-menu.png') });
    expect(fake.reports()).toHaveLength(0); // opening the menu starts nothing

    await menu.getByRole('menuitem', { name: 'Download as PDF' }).click();
    await expect.poll(() => fake.reports().length).toBe(1);
    expect(fake.reports()[0]).toMatchObject({ format: 'pdf' });
    await expect(page.getByText(/Preparing your download/)).toBeVisible();
    await expect(page.getByRole('menu')).toHaveCount(0);

    await page.getByRole('button', { name: 'Download response' }).click();
    await page.getByRole('menuitem', { name: 'Download as CSV' }).click();
    await expect.poll(() => fake.reports().length).toBe(2);
    expect(fake.reports()[1]).toMatchObject({ format: 'csv' });
  });

  test('the options popover and the search close with Escape without closing the drawer', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await openDrawer(page);
    await page.getByRole('button', { name: 'View options' }).click();
    await expect(page.getByRole('group', { name: 'Response view options' })).toBeVisible();
    await page.getByRole('group', { name: 'Response view options' }).screenshot({ path: testInfo.outputPath('options-popover.png') });
    // Density is one control as wide as the popover, its two options sharing the width.
    const density = page.getByRole('radiogroup', { name: 'Density' });
    const [group, comfortable, compact] = await Promise.all([
      density.boundingBox(),
      density.getByRole('radio', { name: 'Comfortable' }).boundingBox(),
      density.getByRole('radio', { name: 'Compact' }).boundingBox(),
    ]);
    expect(Math.abs(comfortable!.width - compact!.width)).toBeLessThan(2);
    expect(comfortable!.width + compact!.width).toBeGreaterThan(group!.width - 12);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('group', { name: 'Response view options' })).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('/');
    await expect(page.getByRole('searchbox', { name: 'Search in response' })).toBeFocused();
    await page.keyboard.type('director');
    await expect(card(page).getByRole('heading', { level: 4 })).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('searchbox', { name: 'Search in response' })).toHaveValue('');
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('"Show empty answers" off hides the unanswered rows and says how many', async ({ page, context }) => {
    await installBackend(context);
    await openDrawer(page);
    await page.getByRole('button', { name: 'View options' }).click();
    await page.getByRole('switch', { name: 'Show empty answers' }).click();
    await expect(page.getByText('3 empty hidden.')).toBeVisible();
    await expect(card(page).getByText('Twitter page link')).toHaveCount(0);
    await card(page).getByRole('button', { name: 'Show', exact: true }).click();
    await expect(card(page).getByText('Twitter page link')).toBeVisible();
  });
});

const NO_SCROLL = () => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1;

async function axeViolations(page: Page, include: string) {
  // axe-core is not a direct dependency (it ships inside eslint-plugin-jsx-a11y); it is injected from there.
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  return page.evaluate(async (selector) => {
    const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: { id: string; impact: string; nodes: { target: string[] }[] }[] }> } }).axe;
    const result = await axe.run({ include: [[selector]] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return result.violations.map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.map((n) => n.target.join(' ')).slice(0, 12) }));
  }, include);
}

test.describe('Full-screen response page', () => {
  for (const [width, height] of [[360, 800], [768, 1024], [1440, 900], [1920, 1080]] as const) {
    test(`${width}px: nothing scrolls sideways and the page has no accessibility violations`, async ({ page, context }, testInfo) => {
      await installBackend(context);
      await page.setViewportSize({ width, height });
      await page.goto(pageUrl);
      await expect(card(page)).toBeVisible({ timeout: 60000 });
      await expect(card(page)).toContainText('Night Train', { timeout: 30000 });

      expect(await page.evaluate(NO_SCROLL), 'no horizontal scroll').toBe(true);

      if (width >= 1024) {
        // card and overview side by side, no tabs
        await expect(page.getByRole('tablist')).toHaveCount(0);
        await expect(page.getByText('Response overview')).toBeVisible();
        const cardBox = (await card(page).boundingBox())!;
        expect(cardBox.width).toBeGreaterThan(500);
        // The same two columns as the drawer, filling the page: the overview is 20 to 24rem wide and reaches the right edge of the
        // page content, so no empty gutters are left around a narrow centred block.
        const aside = (await page.locator('aside').filter({ hasText: 'Response overview' }).boundingBox())!;
        expect(aside.width).toBeGreaterThanOrEqual(319);
        expect(aside.width).toBeLessThanOrEqual(385);
        expect(aside.x).toBeGreaterThan(cardBox.x + cardBox.width - 1); // beside the card, not under it
        expect(aside.x + aside.width).toBeGreaterThan(width - 130);
        expect(cardBox.width).toBeGreaterThan(aside.width * 1.8);
      } else {
        await expect(page.getByRole('tablist', { name: 'Response sections' })).toBeVisible();
        await expect(page.getByRole('tab')).toHaveCount(2); // personal form shared with nobody: Response, Details
      }

      if (width < 768) {
        // Only the list fits; the switcher gives way to a quiet note, and touch targets are big enough.
        expect(await layoutOf(page)).toBe('list');
        await expect(page.getByRole('radiogroup', { name: 'Layout' })).toHaveCount(0);
        await expect(page.getByText('Shown as a list on small screens')).toBeVisible();
        const options = (await page.getByRole('button', { name: 'View options' }).boundingBox())!;
        expect(options.height).toBeGreaterThanOrEqual(40);
      }

      await page.screenshot({ path: testInfo.outputPath(`page-${width}.png`), fullPage: false });
      const violations = await axeViolations(page, 'main, [role=main]');
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    });
  }

  test('1440px: each layout on the full-screen page, with the toolbar staying in view while the card scrolls', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(pageUrl);
    await expect(card(page)).toContainText('Night Train', { timeout: 60000 });
    for (const name of ['Grid', 'List', 'Table']) {
      await page.getByRole('radio', { name }).click();
      await expect(card(page)).toHaveAttribute('data-layout', name.toLowerCase());
      await expectEveryQuestion(page);
      await page.screenshot({ path: testInfo.outputPath(`page-1440-${name.toLowerCase()}.png`) });
      expect(await page.evaluate(NO_SCROLL)).toBe(true);
    }

    // scroll to the bottom: the switcher is still reachable at the top of the screen
    await page.getByRole('radio', { name: 'List' }).click();
    await page.evaluate(() => document.querySelector('main')?.scrollTo({ top: 99999 }));
    await page.evaluate(() => window.scrollTo({ top: 99999 }));
    const radio = page.getByRole('radio', { name: 'List' });
    await expect(radio).toBeInViewport();
  });

  test('a 5,000-character answer wraps inside the card and the page never scrolls sideways', async ({ page, context }) => {
    await installBackend(context, { stress: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(pageUrl);
    await expect(card(page)).toContainText('Name of Director', { timeout: 60000 });
    await expect(card(page).getByRole('button', { name: /Show more/ }).first()).toBeVisible();
    for (const name of ['Grid', 'List', 'Table']) {
      await page.getByRole('radio', { name }).click();
      expect(await page.evaluate(NO_SCROLL), `${name}: no horizontal scroll`).toBe(true);
      const overflowing = await card(page).evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(overflowing, `${name}: card content stays inside the card`).toBe(false);
    }
  });
});
