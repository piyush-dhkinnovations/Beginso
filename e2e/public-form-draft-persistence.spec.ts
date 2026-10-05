import { test, expect } from '@playwright/test';

/** Draft persistence — a post-launch addition, not part of the original Requirements 0–11 (see tasks.md task 5.9). */

test.describe('Public form — draft persistence', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear()).catch(() => {});
  });

  test('answers survive a full page reload', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await page.getByLabel('Full name', { exact: false }).fill('Draft Persistence Test');
    await page.getByLabel('Email address', { exact: false }).fill('draft@example.com');
    await page.waitForTimeout(700); // let the 400ms debounced save fire

    await page.reload();
    await expect(page.getByLabel('Full name', { exact: false })).toHaveValue('Draft Persistence Test');
    await expect(page.getByLabel('Email address', { exact: false })).toHaveValue('draft@example.com');
  });

  test('the draft is cleared after a successful submission', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await page.getByLabel('Full name', { exact: false }).fill('Jane Doe');
    await page.getByLabel('Email address', { exact: false }).fill('jane@example.com');
    await page.getByLabel('Country', { exact: false }).selectOption('United States');
    await page.waitForTimeout(700);

    await page.locator('form').getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Step 2 of 2')).toBeVisible();
    await page.getByText('Search', { exact: true }).click();
    await page.locator('form').getByRole('button', { name: 'Review answers', exact: true }).click();
    await page.locator('form').getByRole('button', { name: 'Submit', exact: true }).click();
    await page.waitForURL('**/success**');

    const draft = await page.evaluate(() => localStorage.getItem('beginso:draft:mock-valid'));
    expect(draft).toBeNull();
  });

  test('drafts for different slugs are kept separate', async ({ page }) => {
    await page.goto('/f/mock-valid');
    await page.getByLabel('Full name', { exact: false }).fill('Form One Answer');
    await page.waitForTimeout(700);

    const draftKeys = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith('beginso:draft:'))
    );
    expect(draftKeys).toEqual(['beginso:draft:mock-valid']);
  });
});
