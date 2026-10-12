import { test, expect } from '@playwright/test';

/** Requirement 8 (Success screen) — both the normal (via submission) and direct-navigation paths. */

test.describe('Public form — success page', () => {
  test('a submission landing (with its title) renders the generic thank-you, not an error', async ({ page }) => {
    // A bare visit redirects back to the form on purpose (it must not claim success); the shell always adds ?title=.
    await page.goto('/f/mock-valid/success?title=Customer%20Feedback%20Survey');
    await expect(page.getByText('Thank you!')).toBeVisible();
    await expect(page.getByText('Your response has been submitted successfully.')).toBeVisible();
  });

  test('with title/message search params, shows the form title and custom message', async ({ page }) => {
    await page.goto('/f/mock-valid/success?title=Customer%20Feedback%20Survey&message=Thanks%20a%20lot!');
    await expect(page.getByText('Thank you!')).toBeVisible();
    await expect(page.getByText('Thanks a lot!')).toBeVisible();
    await expect(page.getByText('Customer Feedback Survey')).toBeVisible();
  });

  test('has a link back to the public form to submit another response', async ({ page }) => {
    await page.goto('/f/mock-valid/success?title=Customer%20Feedback%20Survey');
    const link = page.getByRole('link', { name: 'Submit another response' });
    await expect(link).toHaveAttribute('href', '/f/mock-valid');
  });
});
