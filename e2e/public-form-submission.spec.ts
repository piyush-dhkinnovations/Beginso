import { test, expect } from '@playwright/test';

/**
 * Requirement 6 (submission). Uses the mock server's slug-encoded scenarios
 * (see e2e/mockServer.ts) — mock-submit-422 / -429 / -500 change only the
 * /submit response; the GET schema is identical to mock-valid in all cases.
 */

async function fillAndReachLastPage(page: import('@playwright/test').Page, slug: string) {
  await page.goto(`/f/${slug}`);
  await page.getByLabel('Full name', { exact: false }).fill('Jane Doe');
  await page.getByLabel('Email address', { exact: false }).fill('jane@example.com');
  await page.getByLabel('Country', { exact: false }).selectOption('United States');
  await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 2 of 2')).toBeVisible();
  await page.getByText('Search', { exact: true }).click(); // required multiple-choice
}

test.describe('Public form — submission', () => {
  test('a successful submission navigates to the success page with the form title', async ({ page }) => {
    await fillAndReachLastPage(page, 'mock-valid');
    await page.locator('form').getByRole('button', { name: 'Review answers', exact: true }).click();
    await page.locator('form').getByRole('button', { name: 'Submit', exact: true }).click();
    await page.waitForURL('**/success**');
    await expect(page.getByText('Customer Feedback Survey')).toBeVisible();
  });

  test('a 422 shows the backend error message and re-enables Submit, without navigating', async ({ page }) => {
    await fillAndReachLastPage(page, 'mock-submit-422');
    await page.locator('form').getByRole('button', { name: 'Review answers', exact: true }).click();
    const submitBtn = page.locator('form').getByRole('button', { name: 'Submit', exact: true });
    await submitBtn.click();

    await expect(page.getByText('Email is required.')).toBeVisible();
    await expect(page).not.toHaveURL(/success/);
    await expect(submitBtn).toBeEnabled();
  });

  test('a 429 shows the rate-limit message', async ({ page }) => {
    await fillAndReachLastPage(page, 'mock-submit-429');
    await page.locator('form').getByRole('button', { name: 'Review answers', exact: true }).click();
    await page.locator('form').getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByText('Too many submissions from your connection. Please wait a minute and try again.')).toBeVisible();
  });

  test('a 500 shows a generic error message', async ({ page }) => {
    await fillAndReachLastPage(page, 'mock-submit-500');
    await page.locator('form').getByRole('button', { name: 'Review answers', exact: true }).click();
    await page.locator('form').getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByText('Something went wrong. Please try again.')).toBeVisible();
  });

  test('the honeypot field is sent as an empty string for a real respondent', async ({ page }) => {
    let honeypotValue: string | null = null;
    await page.route('**/api/public/mock-valid/submit', async (route) => {
      const body = route.request().postData() ?? '';
      const hpMatch = body.match(/name="_hp"\r\n\r\n([\s\S]*?)\r\n--/);
      honeypotValue = hpMatch ? hpMatch[1] : null;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await fillAndReachLastPage(page, 'mock-valid');
    await page.locator('form').getByRole('button', { name: 'Review answers', exact: true }).click();
    await page.locator('form').getByRole('button', { name: 'Submit', exact: true }).click();
    await page.waitForURL('**/success**');

    expect(honeypotValue).toBe('');
  });
});
