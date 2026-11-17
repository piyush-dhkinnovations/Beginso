import { test, expect } from '@playwright/test';

// The public template gallery in a real browser: the cards are in the HTML the server sends, search and groups filter and keep the address, the empty
// state offers a way out, "Use template" signed out goes through sign-up carrying the SLUG, and a phone gets one column without sideways scrolling.

const card = (page: import('@playwright/test').Page, name: string) => page.locator('article', { hasText: name });

// Opens the gallery and waits until it is ready to be clicked: a click before the page has finished hydrating (the dev server is slow to) can be lost.
async function openReady(page: import('@playwright/test').Page, path = '/discover-templates') {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

test('the cards and the head are in the HTML the server sends, before any script runs', async ({ request }) => {
  const res = await request.get('/discover-templates');
  expect(res.status()).toBe(200);
  // React puts a comment between two pieces of text that sit side by side; a reader of the HTML does not see it
  const html = (await res.text()).replace(/<!-- -->/g, '');
  for (const name of ['Volunteer Signup', 'Donation Form', 'Job Application', 'Exit Interview', 'Wedding RSVP', 'Long Survey']) expect(html).toContain(name);
  expect(html).toContain('about 2 minutes');
  expect(html).toContain('Featured');
  // a real description, and the tags a shared link needs
  expect(html).toMatch(/<meta name="description" content="Free form templates for hiring, events, feedback, bookings and more/);
  expect(html).not.toContain('Automated Beginso');
  expect(html).toMatch(/property="og:title"/);
  expect(html).toMatch(/property="og:description"/);
  expect(html).toMatch(/name="twitter:card" content="summary_large_image"/);
  expect(html).toMatch(/property="og:image"/);
});

test('search filters by name and description, and the address follows', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/discover-templates');
  await expect(card(page, 'Wedding RSVP')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search templates' }).fill('wedding');
  await expect(card(page, 'Wedding RSVP')).toBeVisible();
  await expect(card(page, 'Job Application')).toHaveCount(0);
  await expect(page.getByText('1 of 6 templates')).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('wedding');

  // a description word finds a template too
  await page.getByRole('searchbox', { name: 'Search templates' }).fill('cover letters');
  await expect(card(page, 'Job Application')).toBeVisible();
});

test('a group filters the cards, shows its count, and goes in the address; a shared link opens already filtered', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/discover-templates');
  const nav = page.getByRole('navigation', { name: 'Template categories' });
  await expect(nav.getByRole('button', { name: /^HR\s*2/ })).toBeVisible();
  await nav.getByRole('button', { name: /^HR/ }).click();
  await expect(card(page, 'Job Application')).toBeVisible();
  await expect(card(page, 'Exit Interview')).toBeVisible();
  await expect(card(page, 'Wedding RSVP')).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe('HR & Hiring');

  // the shared link: opened fresh, already filtered
  await page.goto('/discover-templates?category=HR%20%26%20Hiring&q=exit');
  await expect(card(page, 'Exit Interview')).toBeVisible();
  await expect(card(page, 'Job Application')).toHaveCount(0);
  await expect(page.getByRole('searchbox', { name: 'Search templates' })).toHaveValue('exit');
});

test('the Featured strip is shown while browsing and gone while filtering', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/discover-templates');
  const featured = page.getByRole('region', { name: 'Featured' });
  await expect(featured.getByRole('heading', { level: 3 })).toHaveText(['Volunteer Signup', 'Donation Form']);
  await page.getByRole('searchbox', { name: 'Search templates' }).fill('a');
  await expect(featured).toHaveCount(0);
});

test('nothing matching says so and offers to clear the filters or start from a blank form', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/discover-templates?q=zzzzzz');
  await expect(page.getByText('No templates match your search.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start from a blank form' }).first()).toHaveAttribute('href', '/try');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(card(page, 'Wedding RSVP')).toBeVisible();
  await expect(page.getByText('No templates match your search.')).toHaveCount(0);
});

test('a card opens its page, and Use template signed out goes through sign-up carrying the slug', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openReady(page);
  const volunteer = card(page, 'Volunteer Signup').first();
  // the buttons show on hover
  await volunteer.hover();
  const use = volunteer.getByRole('link', { name: 'Use the Volunteer Signup template' });
  await expect(use).toBeVisible();
  await expect(use).toHaveAttribute('href', `/signup?next=${encodeURIComponent('/templates/apply/volunteer-signup')}`);
  await use.click();
  await expect(page).toHaveURL(/\/signup\?next=%2Ftemplates%2Fapply%2Fvolunteer-signup$/);
});

test('a click anywhere on a card opens its page (the whole card is the link)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openReady(page);
  const wedding = card(page, 'Wedding RSVP');
  // in the middle of the window, so the whole card (and its lower corner) is on screen
  await wedding.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const box = (await wedding.boundingBox())!;
  // the picture's top-left corner: away from the name and the buttons, and on screen
  await page.mouse.click(box.x + 60, box.y + 40);
  // the first visit to that page compiles it in the dev server, which can take a while
  await expect(page).toHaveURL(/\/discover-templates\/wedding-rsvp$/, { timeout: 60000 });
});

test('on a phone: one column, the groups are a row that scrolls sideways, and the page itself does not', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/discover-templates');
  await expect(card(page, 'Wedding RSVP')).toBeVisible();
  const boxes = await page.locator('article').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(boxes).size, 'one column: every card starts at the same left edge').toBe(1);
  const nav = page.getByRole('navigation', { name: 'Template categories' });
  const scrolls = await nav.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(scrolls, 'the groups are wider than the screen and scroll sideways').toBe(true);
  const page_ = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(page_, 'the page does not scroll sideways').toBe(true);
  // tap targets of at least 44 px
  const heights = await nav.getByRole('button').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
});
