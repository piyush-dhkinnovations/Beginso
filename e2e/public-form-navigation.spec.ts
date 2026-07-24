import { test, expect } from '@playwright/test';

/**
 * Requirement 3 (multi-page navigation) — including the regression test for the
 * "Next silently submits" button-key bug found and fixed on Fri 24 Jul (missing
 * `key` props caused React to reuse the clicked DOM node for the next render's
 * Submit button, mid-event).
 */

async function fillPage1(page: import('@playwright/test').Page) {
  await page.getByLabel('Full name', { exact: false }).fill('Jane Doe');
  await page.getByLabel('Email address', { exact: false }).fill('jane@example.com');
  await page.getByLabel('Country', { exact: false }).selectOption('United States');
}

test.describe('Public form — multi-page navigation', () => {
  test('Next advances to page 2 and Back returns to page 1 with values retained', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await fillPage1(page);
    await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Step 2 of 2')).toBeVisible();

    await page.locator('form').getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByText('Step 1 of 2')).toBeVisible();
    await expect(page.getByLabel('Full name', { exact: false })).toHaveValue('Jane Doe');
    await expect(page.getByLabel('Email address', { exact: false })).toHaveValue('jane@example.com');
  });

  test('Back is not shown on the first page', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await expect(page.locator('form').getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
  });

  test('regression: clicking Next on a valid page never fires a network request to /submit', async ({ page }) => {
    let submitCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/submit')) submitCalled = true;
    });

    await page.goto('/f/mock-valid');
    await fillPage1(page);
    await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Step 2 of 2')).toBeVisible();

    expect(submitCalled).toBe(false);
  });

  test('the last page shows Submit, not Next', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await fillPage1(page);
    await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Step 2 of 2')).toBeVisible();

    await expect(page.locator('form').getByRole('button', { name: 'Submit', exact: true })).toBeVisible();
    await expect(page.locator('form').getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
  });
});
