import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * "Anyone with the link, with their email": the form's own Email question is verified in place. The respondent presses Verify, opens the
 * email (here: the /confirm-email page in a second tab) and the first tab notices on its own; only then can the form be submitted, and the
 * submit carries the proof. The backend's verify / status / confirm / submit endpoints are faked in the browser (they are called from the
 * page, cross-origin); the form itself comes from the mock server (slug contains "tracked-email").
 */
const SLUG = 'e2e-tracked-email';
const PATH = `/f/${SLUG}`;
const VERIFICATION_ID = 'e2e-verification-id-0123456789abcdef';
const LINK_TOKEN = 'e2e-link-token-0123456789abcdefghij';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

async function fakeBackend(context: BrowserContext) {
  const state = { verified: false, requested: [] as string[], submits: [] as { proof: string | null; email: string | null }[], submitCode: 200 };
  await context.route(`**/api/public/${SLUG}/verify-email`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    state.requested.push((req.postDataJSON() as { email: string }).email);
    return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ success: true, verificationId: VERIFICATION_ID }) });
  });
  await context.route(`**/api/public/${SLUG}/verify-email/*`, async (route) => {
    const body = state.verified ? { success: true, status: 'verified', email: state.requested.at(-1) } : { success: true, status: 'pending', email: state.requested.at(-1) };
    return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await context.route('**/api/public/email-verification/confirm', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const ok = (route.request().postDataJSON() as { token: string }).token === LINK_TOKEN;
    if (ok) state.verified = true;
    return route.fulfill({ status: ok ? 200 : 404, headers: CORS, contentType: 'application/json', body: JSON.stringify({ success: ok, state: ok ? 'verified' : 'invalid' }) });
  });
  await context.route(`**/api/public/${SLUG}/submit`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const raw = req.postData() ?? '';
    const proof = /name="emailVerificationId"\r\n\r\n([^\r\n]+)/.exec(raw)?.[1] ?? null;
    const email = /"respondentEmail":"([^"]+)"/.exec(raw)?.[1] ?? null;
    state.submits.push({ proof, email });
    if (state.submitCode !== 200) {
      return route.fulfill({ status: state.submitCode, headers: CORS, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email address before submitting' } }) });
    }
    return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  return state;
}

async function openForm(page: Page) {
  await page.goto(PATH);
  await expect(page.getByLabel('Full name')).toBeVisible({ timeout: 60000 });
}
const NO_SCROLL = () => document.documentElement.scrollWidth <= window.innerWidth + 1;

test.describe('Verifying the respondent email', () => {
  test('one email field with a Verify button beside it, and no second "Your email" box', async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await fakeBackend(context);
    await openForm(page);
    await expect(page.getByLabel(/Your email/)).toHaveCount(0);
    const input = page.getByLabel('Email address');
    const verify = page.getByRole('button', { name: 'Verify' });
    await expect(input).toBeVisible();
    await expect(verify).toBeDisabled(); // nothing typed yet
    const a = (await input.boundingBox())!;
    const b = (await verify.boundingBox())!;
    expect(b.x, 'Verify is at the right of the field').toBeGreaterThan(a.x + a.width - 1);
    expect(Math.abs(b.y + b.height / 2 - (a.y + a.height / 2)), 'and level with it').toBeLessThan(a.height);
    await page.screenshot({ path: testInfo.outputPath('verify-1280.png') });
  });

  test('press Verify, confirm in the email link, the form notices, then submit sends the proof', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const fake = await fakeBackend(context);
    await openForm(page);
    await page.getByLabel('Full name').fill('Asha Rao');
    await page.getByLabel('Email address').fill('asha@example.com');

    // submitting before verifying is refused, on the page, without calling the backend
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText(/Verify your email address to submit/).first()).toBeVisible();
    expect(fake.submits).toHaveLength(0);

    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page.getByText(/We sent a link to/)).toContainText('asha@example.com');
    expect(fake.requested).toEqual(['asha@example.com']);
    await expect(page.getByRole('button', { name: /Resend/ })).toBeDisabled(); // not twice in a row

    // the respondent opens the link from the email in another tab
    const other = await context.newPage();
    await other.goto(`/confirm-email/${LINK_TOKEN}`);
    await expect(other.getByText('Your email is confirmed')).toBeVisible({ timeout: 60000 });
    await other.close();

    // the form tab notices on its own (it checks every few seconds and when it is shown again)
    await page.bringToFront();
    await expect(page.getByText('Verified', { exact: true })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Submit' }).click();
    await expect.poll(() => fake.submits.length).toBe(1);
    expect(fake.submits[0]).toEqual({ proof: VERIFICATION_ID, email: 'asha@example.com' });
  });

  test('changing the address after verifying asks for a new verification', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const fake = await fakeBackend(context);
    fake.verified = true;
    await openForm(page);
    await page.getByLabel('Email address').fill('asha@example.com');
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page.getByText('Verified', { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByLabel('Email address').fill('someone.else@example.com');
    await expect(page.getByText('Verified', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Verify' })).toBeEnabled();
  });

  test('a stale or used confirm link says so', async ({ page, context }) => {
    await fakeBackend(context);
    await page.goto('/confirm-email/some-other-token-0123456789abcdef');
    await expect(page.getByText('This link does not work')).toBeVisible({ timeout: 60000 });
  });

  for (const [width, height] of [[390, 800], [768, 1024]] as const) {
    test(`${width}px: Verify stays beside the field, nothing is cut off, the page does not scroll sideways`, async ({ page, context }) => {
      await page.setViewportSize({ width, height });
      await fakeBackend(context);
      await openForm(page);
      expect(await page.evaluate(NO_SCROLL)).toBe(true);
      const input = (await page.getByLabel('Email address').boundingBox())!;
      const verify = (await page.getByRole('button', { name: 'Verify' }).boundingBox())!;
      expect(verify.x + verify.width, 'Verify is inside the window').toBeLessThanOrEqual(width);
      expect(input.width, 'the field is still wide enough to type in').toBeGreaterThanOrEqual(180);
      expect(verify.height).toBeGreaterThanOrEqual(36);
    });
  }

  test('has no accessibility violations', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await fakeBackend(context);
    await openForm(page);
    await page.getByLabel('Email address').fill('asha@example.com');
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page.getByText(/We sent a link to/)).toBeVisible();
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe;
      const result = await axe.run({ include: [['form']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      return result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target.join(' ')).slice(0, 4) }));
    });
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});
