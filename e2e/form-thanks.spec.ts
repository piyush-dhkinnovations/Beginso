import { test, expect } from '@playwright/test';

// The thank-you screen (branding.theme.success) in a real page: the owner's headline, picture, accent colour and confetti, and a redirect that names the
// place, counts down, can be stopped, and does go on when it is not. A form that sets none of it keeps the usual screen.

const SUCCESS = '/f/look-classic-thanks/success?title=Customer%20Feedback%20Survey';

test.describe('thank-you screen', () => {
  test('the owner\'s headline, picture, accent colour and confetti', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto(SUCCESS);
    await expect(page.getByRole('heading', { name: "You're in!" })).toBeVisible();
    await expect(page.getByText('Thank you!')).toHaveCount(0);

    // the picture is on the card, above the words
    const img = page.locator('main img');
    await expect(img).toBeVisible();
    const imgBox = (await img.boundingBox())!;
    const headingBox = (await page.getByRole('heading', { name: "You're in!" }).boundingBox())!;
    expect(imgBox.y + imgBox.height).toBeLessThanOrEqual(headingBox.y);

    // the check takes the accent colour (green), not the form's blue
    const check = page.locator('main span.aa-pop.inset-3');
    await expect.poll(() => check.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(22, 163, 74)');

    // confetti is there
    await expect(page.locator('.aa-confetti')).toHaveCount(36);
  });

  test('no confetti for someone who asks their device for less motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(SUCCESS);
    await expect(page.getByRole('heading', { name: "You're in!" })).toBeVisible();
    await expect(page.locator('.aa-confetti').first()).toBeHidden();
  });

  test('names the place and counts down, and Stay here keeps the person on the page', async ({ page }) => {
    await page.goto(SUCCESS);
    const notice = page.getByTestId('redirect-notice');
    await expect(notice).toContainText('Taking you to example.com');
    await page.getByRole('button', { name: 'Stay here' }).click();
    await expect(notice).toContainText('You stayed here');
    await page.waitForTimeout(3600);
    expect(new URL(page.url()).pathname).toBe('/f/look-classic-thanks/success');
    await expect(page.getByRole('link', { name: 'Go to example.com' })).toHaveAttribute('href', 'https://example.com/welcome');
  });

  test('goes on to the address when nobody stops it', async ({ page }) => {
    await page.route('https://example.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Welcome page</h1>' }));
    await page.goto(SUCCESS);
    await expect(page.getByRole('heading', { name: 'Welcome page' })).toBeVisible({ timeout: 10000 });
    expect(page.url()).toBe('https://example.com/welcome');
  });

  test('a form that sets none of it keeps the usual screen: Thank you!, no picture, no confetti, no redirect', async ({ page }) => {
    await page.goto('/f/look-classic-none/success?title=Customer%20Feedback%20Survey');
    await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
    await expect(page.locator('main img')).toHaveCount(0);
    await expect(page.locator('.aa-confetti')).toHaveCount(0);
    await expect(page.getByTestId('redirect-notice')).toHaveCount(0);
  });
});
