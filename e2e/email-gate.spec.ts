import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * "Anyone, with a verified email": the respondent sees only an email field (and Google) before the form starts, gets a 6-digit code, types it,
 * and only then sees the questions. A signed-in Beginso account skips the code. The backend's code and submit endpoints are faked in the
 * browser (they are called from the page, cross-origin); the form comes from the mock server (slug contains "tracked-email").
 */
const SLUG = 'e2e-tracked-email';
const PATH = `/f/${SLUG}`;
const VERIFICATION_ID = 'e2e-verification-id-0123456789abcdef';
const CODE = '482913';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

async function fakeBackend(context: BrowserContext) {
  const state = { requested: [] as string[], codes: [] as string[], submits: [] as { proof: string | null; ticket: string | null; email: string | null }[], ticketsAsked: 0 };
  await context.route(`**/api/public/${SLUG}/verify-email`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    state.requested.push((req.postDataJSON() as { email: string }).email);
    return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ success: true, verificationId: VERIFICATION_ID }) });
  });
  await context.route(`**/api/public/${SLUG}/verify-email/*/code`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const code = (req.postDataJSON() as { code: string }).code;
    state.codes.push(code);
    const right = code === CODE;
    return route.fulfill({
      status: right ? 200 : 422,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify(right ? { success: true, state: 'verified', email: state.requested.at(-1) } : { success: false, state: 'wrong', attemptsLeft: 4 }),
    });
  });
  await context.route(`**/api/backend/api/public/${SLUG}/submit-ticket`, async (route) => {
    state.ticketsAsked += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, ticket: 'e2e-ticket', expiresInSeconds: 120 }) });
  });
  await context.route(`**/api/public/${SLUG}/submit`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const raw = req.postData() ?? '';
    state.submits.push({
      proof: /name="emailVerificationId"\r\n\r\n([^\r\n]+)/.exec(raw)?.[1] ?? null,
      ticket: /name="ticket"\r\n\r\n([^\r\n]+)/.exec(raw)?.[1] ?? null,
      email: /"respondentEmail"/.test(raw) ? 'sent' : null,
    });
    return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  return state;
}

async function signedOut(page: Page) {
  await page.route('**/api/backend/api/auth/me', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) }));
}
async function signedIn(page: Page) {
  await page.route('**/api/backend/api/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: { id: 'u1', name: 'Mira Shah', email: 'mira@example.com', onboardingCompleted: true } }) })
  );
}
async function openGate(page: Page) {
  await page.goto(PATH);
  await expect(page.getByRole('heading', { name: 'Confirm your email to respond' })).toBeVisible({ timeout: 60000 });
}
const NO_SCROLL = () => document.documentElement.scrollWidth <= window.innerWidth + 1;

test.describe('Email gate', () => {
  test('shows only an email field, Send code and Google: no password, no Create account, no questions yet', async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await fakeBackend(context);
    await signedOut(page);
    await openGate(page);
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send code' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/ })).toBeVisible();
    await expect(page.getByLabel(/Password/)).toHaveCount(0);
    await expect(page.getByText(/Create account/)).toHaveCount(0);
    await expect(page.getByLabel('Full name')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('gate-email.png') });
  });

  test('email, code, then the form: a wrong code is refused, the right one opens the form, and the submit carries the proof', async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const fake = await fakeBackend(context);
    await signedOut(page);
    await openGate(page);

    await page.getByLabel('Email address').fill('asha@example.com');
    await page.getByRole('button', { name: 'Send code' }).click();
    await expect(page.getByRole('heading', { name: 'Enter your code' })).toBeVisible();
    expect(fake.requested).toEqual(['asha@example.com']);
    await page.screenshot({ path: testInfo.outputPath('gate-code.png') });

    await page.getByLabel('Digit 1 of 6').click();
    await page.keyboard.type('000000');
    await expect(page.getByText('That code is not right. 4 tries left.')).toBeVisible();
    await expect(page.getByLabel('Full name')).toHaveCount(0);

    await page.getByLabel('Digit 1 of 6').click();
    await page.keyboard.type(CODE); // the sixth digit sends it: no button to press
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByText('Responding as')).toContainText('asha@example.com');

    await page.getByLabel('Full name').fill('Asha Rao');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect.poll(() => fake.submits.length).toBe(1);
    expect(fake.submits[0]).toEqual({ proof: VERIFICATION_ID, ticket: null, email: null });
  });

  test('a signed-in Beginso account continues in one click, with no code, and submits with a ticket', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const fake = await fakeBackend(context);
    await signedIn(page);
    await openGate(page);
    await expect(page.getByLabel('Email address')).toHaveCount(0);
    await page.getByRole('button', { name: 'Continue as mira@example.com' }).click();
    await expect(page.getByText('Responding as')).toContainText('mira@example.com');
    await page.getByLabel('Full name').fill('Mira Shah');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect.poll(() => fake.submits.length).toBe(1);
    expect(fake.submits[0]).toEqual({ proof: null, ticket: 'e2e-ticket', email: null });
    expect(fake.requested).toHaveLength(0);
  });

  test('a pasted code fills all six boxes and goes in', async ({ page, context }) => {
    await fakeBackend(context);
    await signedOut(page);
    await openGate(page);
    await page.getByLabel('Email address').fill('asha@example.com');
    await page.getByRole('button', { name: 'Send code' }).click();
    const first = page.getByLabel('Digit 1 of 6');
    await first.focus();
    // a real paste: the browser's paste event with the code on the clipboard
    await first.evaluate((el, code) => {
      const data = new DataTransfer();
      data.setData('text', code);
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    }, ` ${CODE.slice(0, 3)} ${CODE.slice(3)} `);
    await expect(page.getByLabel('Full name')).toBeVisible();
  });

  test('the six boxes sit in one row, are touch sized, and fit at 390px', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await fakeBackend(context);
    await signedOut(page);
    await openGate(page);
    await page.getByLabel('Email address').fill('asha@example.com');
    await page.getByRole('button', { name: 'Send code' }).click();
    await expect(page.getByLabel('Digit 6 of 6')).toBeVisible();
    const boxes = [];
    for (let i = 1; i <= 6; i += 1) boxes.push((await page.getByLabel(`Digit ${i} of 6`).boundingBox())!);
    for (const b of boxes) {
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.width).toBeGreaterThanOrEqual(36);
      expect(Math.abs(b.y - boxes[0].y)).toBeLessThan(2);
    }
    expect(boxes[5].x + boxes[5].width).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });

  test('"Change" under Responding as goes back to the gate', async ({ page, context }) => {
    await fakeBackend(context);
    await signedOut(page);
    await openGate(page);
    await page.getByLabel('Email address').fill('asha@example.com');
    await page.getByRole('button', { name: 'Send code' }).click();
    await page.getByLabel('Digit 1 of 6').click();
    await page.keyboard.type(CODE);
    await expect(page.getByLabel('Full name')).toBeVisible();
    await page.getByRole('button', { name: 'Change' }).click();
    await expect(page.getByRole('heading', { name: 'Confirm your email to respond' })).toBeVisible();
  });

  test('Tab goes email, Send code, Google', async ({ page, context }) => {
    await fakeBackend(context);
    await signedOut(page);
    await openGate(page);
    await page.getByLabel('Email address').focus();
    const order: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      order.push(await page.evaluate(() => (document.activeElement as HTMLElement).getAttribute('id') || document.activeElement?.textContent?.trim() || ''));
      await page.keyboard.press('Tab');
    }
    expect(order).toEqual(['gate-email', 'Send code', 'Continue with Google']);
  });

  for (const [width, height] of [[390, 800], [768, 1024], [1440, 900]] as const) {
    test(`${width}px: the gate fits, is a comfortable width, and the page does not scroll sideways`, async ({ page, context }) => {
      await page.setViewportSize({ width, height });
      await fakeBackend(context);
      await signedOut(page);
      await openGate(page);
      expect(await page.evaluate(NO_SCROLL)).toBe(true);
      const email = (await page.getByLabel('Email address').boundingBox())!;
      expect(email.x).toBeGreaterThanOrEqual(0);
      expect(email.x + email.width).toBeLessThanOrEqual(width);
      expect(email.width).toBeLessThanOrEqual(400);
      expect(email.width).toBeGreaterThan(Math.min(240, width - 80));
      for (const name of [/Send code/, /Continue with Google/]) {
        const b = (await page.getByRole('button', { name }).boundingBox())!;
        expect(b.height).toBeGreaterThanOrEqual(40);
      }
    });
  }

  test('has no accessibility violations, on the email step and the code step', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await fakeBackend(context);
    await signedOut(page);
    await openGate(page);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const run = () =>
      page.evaluate(async () => {
        const axe = (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
        const result = await axe.run({ include: [['[aria-label="Confirm your email"]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
        return result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target.join(' ')).slice(0, 4) }));
      });
    expect(await run(), 'email step').toEqual([]);
    await page.getByLabel('Email address').fill('asha@example.com');
    await page.getByRole('button', { name: 'Send code' }).click();
    await expect(page.getByRole('heading', { name: 'Enter your code' })).toBeVisible();
    expect(await run(), 'code step').toEqual([]);
  });
});
