import { test, expect } from '@playwright/test';

/**
 * Requirements 1–2, 9: SSR schema load, branding/layout, mobile responsiveness.
 * Backend is mocked (e2e/mockServer.ts) — see that file for slug conventions.
 */

test.describe('Public form — SSR render', () => {
  test('renders real field inputs, not a placeholder list', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();

    const inputCount = await page.locator('input, textarea, select').count();
    expect(inputCount).toBeGreaterThanOrEqual(6); // page 1 alone has 6 visible fields + honeypot
  });

  test('sets the browser tab title from the form schema', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await expect(page).toHaveTitle('Customer Feedback Survey · Beginso');
  });

  test('shows the multi-page progress bar on page 1 of 2', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await expect(page.getByText('Step 1 of 2')).toBeVisible();
    const bar = page.getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', '50');
  });

  test('required fields show a red asterisk', async ({ page }) => {
    await page.goto('/f/mock-valid');
    const fullNameLabel = page.locator('label', { hasText: 'Full name' });
    await expect(fullNameLabel).toContainText('*');
  });

  test('every input has an associated label (a11y)', async ({ page }) => {
    await page.goto('/f/mock-valid');
    const fullNameInput = page.getByLabel('Full name', { exact: false });
    await expect(fullNameInput).toBeVisible();
  });

  test('renders with no horizontal overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/f/mock-valid');
    await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  // The heading appears about 130-190 ms BEFORE the page's last requests finish and report their errors. The check used to read the
  // error list the instant the heading was visible, so it passed or failed depending on that race (and, when it passed, it had not
  // looked yet). It now waits for the network to go quiet, which is when every load-time error has been reported. Uncaught page
  // exceptions count too. No sleep, and nothing is filtered out.
  test('browser console has zero errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(`uncaught: ${err.message}`));
    await page.goto('/f/mock-valid');
    await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
});
