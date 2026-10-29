import { test, expect, type Page } from '@playwright/test';

/**
 * Small and mid-size screens: the pages the builder and the public form are made of must fit the screen at phone and tablet widths, with no
 * horizontal scroll and nothing that can only be reached by scrolling sideways. Real browser, on the mock server's forms.
 */
const WIDTHS = [320, 390, 768, 1024];

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
});

const overflow = (page: Page) =>
  page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));

for (const width of WIDTHS) {
  test(`the public form fits a ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/f/mock-valid');
    await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible({ timeout: 60000 });
    const { scroll, client } = await overflow(page);
    expect(scroll, 'the form is wider than the screen').toBeLessThanOrEqual(client);
  });

  for (const tab of ['build', 'branding', 'settings', 'share']) {
    test(`the builder's ${tab} tab fits a ${width}px screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/forms/e2e-branding/edit?tab=${tab}`);
      await expect(page.getByRole('tablist', { name: 'Form Builder sections' })).toBeVisible({ timeout: 60000 });
      await page.waitForLoadState('networkidle');
      // polled: the first load of a cold server can still be settling when the page first reports its width
      await expect.poll(async () => { const { scroll, client } = await overflow(page); return scroll - client; }, { message: `the ${tab} tab is wider than the screen` }).toBeLessThanOrEqual(0);
    });
  }
}
