import { test, expect, type Page } from '@playwright/test';

/**
 * A form that needs a Beginso account: the visitor signs in on the form's own page (email and password, or Google), and only
 * "Create account" goes to the sign-up page. The Firebase sign-in itself is covered by unit tests; here the real page is checked:
 * what it shows, how it validates, how it lays out on a phone and a desktop, and where each link goes.
 */
const SLUG = 'e2e-login-required';
const PATH = `/f/${SLUG}`;

async function openGate(page: Page) {
  // Not signed in: the app asks the backend who this is and is told nobody.
  await page.route('**/api/backend/api/auth/me', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) }));
  await page.goto(PATH);
  await expect(page.getByRole('heading', { name: 'Sign in to respond' })).toBeVisible({ timeout: 60000 });
}

const NO_SCROLL = () => document.documentElement.scrollWidth <= window.innerWidth + 1;

test.describe('Sign-in gate of a members-only form', () => {
  test('shows the sign-in form on the page itself, not two buttons that leave it', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openGate(page);

    await expect(page.getByText('Members only form', { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();

    // no link to the main login page any more; creating an account is the only way out, and it comes back here
    await expect(page.locator('a[href^="/login"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', `/signup?next=%2Ff%2F${SLUG}`);
    await page.screenshot({ path: testInfo.outputPath('gate-1280.png') });
  });

  test('stays on the form and says what is missing when "Sign in" is pressed empty', async ({ page }) => {
    await openGate(page);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page.getByLabel('Email Address')).toHaveAttribute('aria-invalid', 'true');
    expect(new URL(page.url()).pathname).toBe(PATH);
  });

  test('rejects an email that is not an email without leaving the page', async ({ page }) => {
    await openGate(page);
    await page.getByLabel('Email Address').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('whatever-1');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByLabel('Email Address')).toHaveAttribute('aria-invalid', 'true');
    expect(new URL(page.url()).pathname).toBe(PATH);
  });

  test('the password can be shown and hidden', async ({ page }) => {
    await openGate(page);
    const password = page.getByLabel('Password', { exact: true });
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
  });

  test('Tab goes email, password, show password, forgot password, Sign in, Google, Create account', async ({ page }) => {
    await openGate(page);
    await page.getByLabel('Email Address').focus();
    const order: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      order.push(await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return el.getAttribute('aria-label') || el.id || el.textContent?.trim() || el.tagName;
      }));
      await page.keyboard.press('Tab');
    }
    expect(order).toEqual(['email', 'password', 'Show password', 'Forgot password?', 'Sign in', 'Sign in with Google', 'Create account']);
  });

  test('Create account goes to the sign-up page and carries the way back to this form', async ({ page }) => {
    await openGate(page);
    await page.getByRole('link', { name: 'Create account' }).click();
    await expect(page).toHaveURL(new RegExp(`/signup\\?next=%2Ff%2F${SLUG}$`));
  });

  for (const [width, height] of [[390, 800], [768, 1024], [1440, 900]] as const) {
    test(`${width}px: the form fits, is a comfortable width, is not cramped, and the page does not scroll sideways`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height });
      await openGate(page);
      expect(await page.evaluate(NO_SCROLL)).toBe(true);

      const email = (await page.getByLabel('Email Address').boundingBox())!;
      expect(email.x).toBeGreaterThanOrEqual(0);
      expect(email.x + email.width).toBeLessThanOrEqual(width);
      expect(email.width).toBeLessThanOrEqual(400); // a form-sized column, not stretched across a wide card
      expect(email.width).toBeGreaterThan(Math.min(240, width - 80));

      // touch-sized buttons, in a single column
      for (const name of ['Sign in', 'Sign in with Google']) {
        const b = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
        expect(b.height, name).toBeGreaterThanOrEqual(40);
      }
      const signIn = (await page.getByRole('button', { name: 'Sign in', exact: true }).boundingBox())!;
      const google = (await page.getByRole('button', { name: 'Sign in with Google' }).boundingBox())!;
      expect(google.y).toBeGreaterThan(signIn.y + signIn.height - 1);

      // the heading and form are centred together
      const heading = (await page.getByRole('heading', { name: 'Sign in to respond' }).boundingBox())!;
      expect(Math.abs(heading.x + heading.width / 2 - (email.x + email.width / 2))).toBeLessThan(24);
      await page.screenshot({ path: testInfo.outputPath(`gate-${width}.png`) });
    });
  }

  test('has no accessibility violations', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openGate(page);
    // axe-core is not a direct dependency (it ships inside eslint-plugin-jsx-a11y); it is injected from there.
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { target: string[]; failureSummary?: string }[] }[] }> } }).axe;
      const result = await axe.run({ include: [['[aria-label="Sign in required"]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      return result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => `${n.target.join(' ')} :: ${n.failureSummary?.split('\n')[1] ?? ''}`).slice(0, 5) }));
    });
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});
