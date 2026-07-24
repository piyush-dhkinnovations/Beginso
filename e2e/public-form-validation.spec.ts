import { test, expect } from '@playwright/test';

/**
 * Requirement 4 (shared field rules + per-type validation), Requirement 3.4
 * (page validation blocks navigation). Backend mocked via e2e/mockServer.ts.
 */

test.describe('Public form — field validation', () => {
  test('clicking Next with empty required fields blocks navigation and shows errors only on required fields', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();

    const alerts = await page.locator('[role="alert"]').allTextContents();
    const requiredCount = alerts.filter((t) => t.includes('This field is required')).length;
    expect(requiredCount).toBe(3); // Full name + Email address + Country (all three required fields on page 1)

    // still on page 1 — Next was blocked
    await expect(page.getByText('Step 1 of 2')).toBeVisible();
  });

  test('required dropdown (Country) also blocks Next when unselected', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await page.getByLabel('Full name', { exact: false }).fill('Jane Doe');
    await page.getByLabel('Email address', { exact: false }).fill('jane@example.com');
    await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Step 1 of 2')).toBeVisible(); // still blocked — Country not selected
  });

  test('regression: an empty required email shows "required", not the format error', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('This field is required').first()).toBeVisible();
    await expect(page.getByText('Please enter a valid email address.')).not.toBeVisible();
  });

  test('an invalid (non-empty) email shows the format error on blur', async ({ page }) => {
    await page.goto('/f/mock-valid');
    const emailInput = page.getByLabel('Email address', { exact: false });
    await emailInput.fill('not-an-email');
    await emailInput.blur();
    await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
  });

  test('a number outside min/max shows the combined range message', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await page.getByLabel('Full name', { exact: false }).fill('Jane Doe');
    await page.getByLabel('Email address', { exact: false }).fill('jane@example.com');
    await page.getByLabel('Age', { exact: false }).fill('150');
    await page.getByLabel('Country', { exact: false }).selectOption('United States');
    await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
    // Age has both min:0 and max:120 set, so the combined range message applies, not a max-only one.
    await expect(page.getByText('Must be between 0 and 120.')).toBeVisible();
  });

  test('the character counter updates live and reflects maxLength', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await page.getByLabel('Full name', { exact: false }).fill('Jane');
    await expect(page.getByText('4/80')).toBeVisible();
  });

  test('page 2: required multiple-choice blocks Submit; optional checkbox does not', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await page.getByLabel('Full name', { exact: false }).fill('Jane Doe');
    await page.getByLabel('Email address', { exact: false }).fill('jane@example.com');
    await page.getByLabel('Country', { exact: false }).selectOption('United States');
    await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Step 2 of 2')).toBeVisible();

    await page.locator('form').getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByText('This field is required')).toBeVisible();
    await expect(page.getByText('Step 2 of 2')).toBeVisible(); // did not navigate away
  });
});
