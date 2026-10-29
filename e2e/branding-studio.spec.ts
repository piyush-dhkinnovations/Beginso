import { test, expect } from '@playwright/test';

/**
 * The Branding tab is one screen: a slim builder header (the title, the save state and the actions on one line), the section tabs, and
 * right under them the controls beside a tall live preview. Real browser, real layout, on the mock server's builder form.
 */
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
});

test('the Branding tab gives the room to the controls and the preview, and a chosen layout keeps its Suggested label', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/forms/e2e-branding/edit?tab=branding');
  const header = page.locator('header').filter({ has: page.getByRole('textbox', { name: 'Form name' }) });
  await expect(header).toBeVisible({ timeout: 60000 });
  const sections = page.getByRole('tablist', { name: 'Branding sections' });
  await expect(sections).toBeVisible();

  // the controls start right under the builder's tabs (no title row of their own), level with the screen switch above the preview
  const builderTabs = (await page.getByRole('tablist', { name: 'Form Builder sections' }).boundingBox())!;
  const sectionTabs = (await sections.boundingBox())!;
  expect(sectionTabs.y - (builderTabs.y + builderTabs.height), 'space between the builder tabs and the controls').toBeLessThan(40);
  await expect(page.getByRole('group', { name: 'Preview device' })).toBeVisible();

  // the preview takes the rest of the screen
  const stage = (await page.getByTitle('Live form preview').boundingBox())!;
  expect(stage.height, 'the preview is tall').toBeGreaterThan(900 * 0.55);
  // on a laptop screen the form is the whole stage, edge to edge: no grey strips around a narrower frame
  const stageBox = (await page.getByTitle('Live form preview').locator('xpath=..').boundingBox())!;
  expect(Math.abs(stage.width - stageBox.width), 'the form is as wide as its stage').toBeLessThan(4);
  expect(stage.y + stage.height, 'and inside the screen').toBeLessThanOrEqual(900 + 2);
  expect(stage.y + stage.height, 'and it uses the screen, not half of it').toBeGreaterThan(900 - 90);

  // the preview frame holds the form alone: none of the app's own frame (sidebar, top bar, dashboard) is ever in it
  const frame = page.frameLocator('iframe[title="Live form preview"]');
  await expect(frame.locator('label').first()).toBeVisible({ timeout: 60000 });
  await expect(frame.locator('aside, nav')).toHaveCount(0);
  await expect(page.getByRole('status', { name: 'Loading the preview' })).toHaveCount(0);

  // choosing the layout the form is suggested keeps the "Suggested" label on it
  const classic = page.getByRole('group', { name: 'Layout' }).getByRole('button', { name: /Classic/ });
  await expect(classic.getByText('Suggested')).toBeVisible();
  await classic.click();
  await expect(classic).toHaveAttribute('aria-pressed', 'true');
  await expect(classic.getByText('Suggested')).toBeVisible();

  // one click on another layout: it is chosen at once
  const guided = page.getByRole('group', { name: 'Layout' }).getByRole('button', { name: /Guided/ });
  await guided.click();
  await expect(guided).toHaveAttribute('aria-pressed', 'true');
  await expect(classic).toHaveAttribute('aria-pressed', 'false');
  await expect(classic.getByText('Suggested')).toBeVisible();

  // every section is a click away
  for (const name of ['Colour', 'Text', 'Style', 'Header']) {
    await sections.getByRole('tab', { name }).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();
  }
  await page.screenshot({ path: testInfo.outputPath('branding-studio.png') });
});

test('Full screen is the real form alone: no top bar, no text about previewing, no frame', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/forms/e2e-branding/preview?bare=1');
  await expect(page.locator('label').first()).toBeVisible({ timeout: 60000 });
  await expect(page.getByText('Preview mode')).toHaveCount(0);
  await expect(page.getByText('Respondents see this exactly as shown')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to editor' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Preview device' })).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0); // the form itself, not a frame of it
  await expect(page.locator('aside')).toHaveCount(0); // none of the app's own frame
});

test('the builder header is the same on the Branding tab as on Build', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/forms/e2e-branding/edit');
  const header = page.locator('header').filter({ has: page.getByRole('textbox', { name: 'Form name' }) });
  await expect(header).toBeVisible({ timeout: 60000 });
  const onBuild = (await header.boundingBox())!;
  await page.getByRole('tab', { name: 'Branding' }).click();
  await expect(page.getByRole('tablist', { name: 'Branding sections' })).toBeVisible();
  const onBranding = (await header.boundingBox())!;
  expect(onBranding.height, 'same height').toBeCloseTo(onBuild.height, 0);
  expect(onBranding.y, 'same place').toBeCloseTo(onBuild.y, 0);
  expect(onBranding.width, 'same width').toBeCloseTo(onBuild.width, 0);
});
