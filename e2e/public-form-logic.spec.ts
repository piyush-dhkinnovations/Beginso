import { test, expect } from '@playwright/test';

/**
 * Requirement 5 (conditional logic). The mock schema's rule: hide "Tell us more"
 * (page 2, long_text) when Country (page 1, dropdown) equals "Canada".
 */

test.describe('Public form — conditional logic', () => {
  test('selecting the hide-trigger value removes the target field from the DOM', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await page.getByLabel('Full name', { exact: false }).fill('Jane Doe');
    await page.getByLabel('Email address', { exact: false }).fill('jane@example.com');
    await page.getByLabel('Country', { exact: false }).selectOption('Canada');
    await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Step 2 of 2')).toBeVisible();

    await expect(page.getByLabel('Tell us more', { exact: false })).toHaveCount(0);
  });

  test('a non-trigger value leaves the target field visible', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await page.getByLabel('Full name', { exact: false }).fill('Jane Doe');
    await page.getByLabel('Email address', { exact: false }).fill('jane@example.com');
    await page.getByLabel('Country', { exact: false }).selectOption('United States');
    await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Step 2 of 2')).toBeVisible();

    await expect(page.getByLabel('Tell us more', { exact: false })).toBeVisible();
  });

  test('the hidden field is excluded from the final submission payload', async ({ page }) => {
    let submittedAnswers: Array<{ fieldId: string; fieldLabel: string }> = [];
    await page.route('**/api/public/mock-valid/submit', async (route) => {
      const body = route.request().postData() ?? '';
      const dataMatch = body.match(/name="data"\r\n\r\n([\s\S]*?)\r\n--/);
      if (dataMatch) {
        submittedAnswers = JSON.parse(dataMatch[1]).answers;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.goto('/f/mock-valid');
    await page.getByLabel('Full name', { exact: false }).fill('Jane Doe');
    await page.getByLabel('Email address', { exact: false }).fill('jane@example.com');
    await page.getByLabel('Country', { exact: false }).selectOption('Canada'); // hides "Tell us more"
    await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Step 2 of 2')).toBeVisible();

    await page.getByText('Search', { exact: true }).click();
    await page.locator('form').getByRole('button', { name: 'Submit', exact: true }).click();
    await page.waitForURL('**/success**');

    const hiddenFieldSubmitted = submittedAnswers.some((a) => a.fieldLabel === 'Tell us more');
    expect(hiddenFieldSubmitted).toBe(false);
  });
});
