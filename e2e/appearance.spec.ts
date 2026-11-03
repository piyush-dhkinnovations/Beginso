import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * Settings > Appearance, in a real browser with the backend faked: the Theme decides which style sections show; a light style and a text size
 * are saved on this device, applied before the first paint after a reload (no flash), never reach the public form, and the dark and light choices
 * each keep their value while the other section is hidden.
 */
async function install(context: BrowserContext) {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  await context.route('**/api/backend/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'u1', name: 'E2E User', email: 'e2e@example.com', onboardingCompleted: true } });
    if (path === 'api/workspaces') return json({ success: true, workspaces: [], total: 0 });
    if (route.request().method() === 'GET' && /notifications|members|stages|tags|views|activity|dashboards/.test(path)) return json([]);
    return json({});
  });
}

// Records every change to <html>'s attributes with its time, so a test can prove the choices were all in place before the first paint.
const recordAttributeChanges = () => {
  (window as unknown as { __changes: [string, number][] }).__changes = [];
  new MutationObserver((records) => {
    for (const r of records) (window as unknown as { __changes: [string, number][] }).__changes.push([String(r.attributeName), performance.now()]);
  }).observe(document.documentElement, { attributes: true });
};

const html = (page: Page) =>
  page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    dark: document.documentElement.getAttribute('data-dark'),
    light: document.documentElement.getAttribute('data-light'),
    text: document.documentElement.getAttribute('data-text'),
    fontSize: getComputedStyle(document.documentElement).fontSize,
    page: getComputedStyle(document.documentElement).getPropertyValue('--bg-page').trim().toUpperCase(),
  }));

async function openAppearance(page: Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/settings?tab=appearance');
  await expect(page.getByRole('radiogroup', { name: 'Theme' })).toBeVisible({ timeout: 60000 });
}

test('Light, Paper and Extra large: applied at once, saved, and in place before the first paint after a reload', async ({ page, context }) => {
  await install(context);
  await context.addInitScript(recordAttributeChanges);
  await openAppearance(page);

  await page.getByRole('radio', { name: /^Light/ }).click();
  await page.getByRole('radio', { name: /^Paper/ }).click();
  await page.getByRole('radio', { name: /^Extra large/ }).click();
  const now = await html(page);
  expect(now).toMatchObject({ theme: null, light: 'paper', text: 'xlarge', fontSize: '20px', page: '#F5F0E6' });

  await page.reload({ waitUntil: 'domcontentloaded' });
  const after = await html(page);
  expect(after, 'in place as soon as the document is ready').toMatchObject({ light: 'paper', text: 'xlarge', fontSize: '20px', page: '#F5F0E6' });
  // nothing is switched on after the first paint: every change to a data-* attribute happened before it
  await expect(page.getByRole('radiogroup', { name: 'Text size' })).toBeVisible({ timeout: 60000 });
  const verdict = await page.evaluate(() => {
    const changes = (window as unknown as { __changes: [string, number][] }).__changes.filter(([name]) => name.startsWith('data-'));
    const firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime ?? Infinity;
    return { lastChange: Math.max(0, ...changes.map(([, t]) => t)), firstPaint, chosen: [document.documentElement.getAttribute('data-light'), document.documentElement.getAttribute('data-text')] };
  });
  expect(verdict.lastChange, 'a data-* attribute changed after the first paint (a flash)').toBeLessThanOrEqual(verdict.firstPaint);
  expect(verdict.chosen).toEqual(['paper', 'xlarge']);
  // and the page shows the saved choices
  await expect(page.getByRole('radio', { name: /^Paper/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: /^Extra large/ })).toHaveAttribute('aria-checked', 'true');
});

test('the Theme decides which style sections show, and a hidden section keeps its choice', async ({ page, context }) => {
  await install(context);
  await openAppearance(page);
  await page.getByRole('radio', { name: /^Mist/ }).click(); // System on a light device shows the light styles
  await page.getByRole('radio', { name: /^Dark/ }).click();
  await page.getByRole('radio', { name: /^Dimmed/ }).click();
  await expect(page.getByRole('radio', { name: /^Mist/ })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: /^Dimmed/ })).toHaveAttribute('aria-checked', 'true');
  expect(await html(page)).toMatchObject({ theme: 'dark', dark: 'dimmed', light: null });

  await page.getByRole('radio', { name: /^Light/ }).click();
  await expect(page.getByRole('radio', { name: /^Dimmed/ })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: /^Mist/ })).toHaveAttribute('aria-checked', 'true');
  expect(await html(page)).toMatchObject({ theme: null, dark: null, light: 'mist' });

  // System looks at the device: in light mode only the light styles show, in dark mode only the dark ones, and the other choice is kept
  await page.emulateMedia({ colorScheme: 'light' });
  await page.getByRole('radio', { name: /^System/ }).click();
  await expect(page.getByText(/Used while your device is in light mode/)).toBeVisible();
  await expect(page.getByRole('radio', { name: /^Mist/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: /^Dimmed/ })).toHaveCount(0);
  await page.emulateMedia({ colorScheme: 'dark' }); // the device switches while the page is open
  await expect(page.getByText(/Used while your device is in dark mode/)).toBeVisible();
  await expect(page.getByRole('radio', { name: /^Dimmed/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: /^Mist/ })).toHaveCount(0);
});

test('System follows the device: the light style by day, the dark style by night, each with its own saved choice', async ({ page, context }) => {
  await install(context);
  await openAppearance(page);
  await page.getByRole('radio', { name: /^Paper/ }).click();
  await page.getByRole('radio', { name: /^Dark/ }).click();
  await page.getByRole('radio', { name: /^Midnight/ }).click();
  await page.getByRole('radio', { name: /^System/ }).click();
  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await html(page)).toMatchObject({ theme: null, light: 'paper', dark: null });
  await page.emulateMedia({ colorScheme: 'dark' }); // the device switches while the page is open
  await expect.poll(async () => (await html(page)).dark).toBe('midnight');
  expect(await html(page)).toMatchObject({ theme: 'dark', light: null });
});

test('the text size and the light style never reach the public form', async ({ page, context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('beginso.textSize', 'xlarge');
    localStorage.setItem('beginso.lightVariant', 'paper');
    localStorage.setItem('beginso.theme', 'light');
  });
  await page.goto('/f/mock-valid');
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible({ timeout: 60000 });
  expect(await html(page)).toMatchObject({ text: null, light: null, fontSize: '16px' });
});
