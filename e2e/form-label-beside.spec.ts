import { test, expect } from '@playwright/test';

// Labels beside the fields (branding.theme.fields.label = 'start'): every field has the whole width to share between its label and its input. A
// full-width field in the form (a text area, a choice) used to make the grid add a second column, and the short fields were squeezed into a sliver.

for (const layout of ['classic', 'card_stack', 'steps', 'split_feature', 'open', 'sidebar']) {
  test(`${layout}: the short fields are as wide as the long one, not squeezed`, async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto(`/f/look-${layout}-beside`);
    const name = page.getByLabel(/Full name/);
    const email = page.getByLabel(/Email address/);
    const more = page.getByLabel(/Tell us more/);
    await expect(name).toBeVisible();
    const [a, b, c] = await Promise.all([name.boundingBox(), email.boundingBox(), more.boundingBox()]);
    expect(a!.width, 'Full name').toBeGreaterThan(300);
    expect(Math.abs(a!.width - b!.width), 'Full name and Email are the same width').toBeLessThan(2);
    expect(Math.abs(a!.width - c!.width), 'and the text area too').toBeLessThan(2);
    // the label is to the left of its input, on the same row
    const label = (await page.getByText('Full name', { exact: false }).first().boundingBox())!;
    expect(label.x + label.width).toBeLessThanOrEqual(a!.x);
  });
}
