import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * Activity and Audit Log: each actor shows their profile picture (not only initials). A person with a picture gets it (from the event
 * itself, so it works for every role); a person without one keeps their initials; the workspace's own events show its logo.
 * The browser-side backend is a fake in this file; the workspace lookup the page does on the server is answered by e2e/mockServer.ts.
 */
const SLUG = 'e2e-avatars-ws';
const WS_ID = '507f1f77bcf86cd799439011';
const WS = { id: WS_ID, name: 'Kala Chashma Entertainment', slug: SLUG, role: 'admin', logo: '/avatars/05.svg', timezone: 'UTC' };

const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
const event = (id: string, actor: { id: string; name: string; email: string; avatarUrl: string | null }, action: string, minutesAgo: number) => ({
  id, workspaceId: WS_ID, actor, action, targetId: 'f1', targetType: 'form', targetLabel: 'Film submissions', metadata: {}, ip: null, createdAt: at(minutesAgo),
});

const PIYUSH = { id: 'u1', name: 'Piyush Prajapat', email: 'piyush@example.com', avatarUrl: '/avatars/03.svg' };
const PLAIN = { id: 'u2', name: 'Meera Nair', email: 'meera@example.com', avatarUrl: null };
const SYSTEM = { id: '', name: 'Kala Chashma Entertainment', email: '', avatarUrl: null };
const EVENTS = [
  event('e1', PIYUSH, 'form.publish', 5),
  event('e2', PLAIN, 'form.update', 15),
  event('e3', SYSTEM, 'response.submit', 25),
  event('e4', PIYUSH, 'form.update', 35),
];

async function installBackend(context: BrowserContext, opts: { membersForbidden?: boolean } = {}) {
  await context.addCookies([{ name: 'beginso_session', value: 'e2e.jwt', url: 'http://localhost:3100' }]);
  await context.route('**/api/backend/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace('/api/backend/', '');
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'api/auth/me') return json({ success: true, user: { id: 'u1', name: 'Piyush Prajapat', email: 'piyush@example.com', onboardingCompleted: true } });
    if (path === 'api/workspaces') return json({ success: true, workspaces: [WS] });
    if (path === `api/workspaces/${SLUG}`) return json({ success: true, workspace: WS });
    if (path === `api/workspaces/${WS_ID}/events` || path === `api/workspaces/${WS_ID}/audit`) return json({ success: true, events: EVENTS, page: 1, limit: 20 });
    if (path === `api/workspaces/${WS_ID}/members` || path === `api/workspaces/${SLUG}/members`) {
      if (opts.membersForbidden) return json({ success: false, message: 'Forbidden' }, 403);
      return json({
        success: true,
        members: [
          { membershipId: 'm1', userId: 'u1', name: 'Piyush Prajapat', email: 'piyush@example.com', avatarUrl: '/avatars/03.svg', role: 'admin', isOwner: false, lastActiveAt: null },
          { membershipId: 'm2', userId: 'u2', name: 'Meera Nair', email: 'meera@example.com', avatarUrl: null, role: 'member', isOwner: false, lastActiveAt: null },
        ],
      });
    }
    if (req.method() === 'GET' && /notifications|stages|tags|views/.test(path)) return json([]);
    return json({});
  });
}

const rowOf = (page: Page, name: string) => page.locator('li, tr').filter({ hasText: name }).first();
const avatarsIn = (page: Page, name: string) => rowOf(page, name).locator('span.bg-avatar');
const imageOf = (page: Page, name: string) => avatarsIn(page, name).first().locator('img');

async function imageLoaded(img: ReturnType<Page['locator']>) {
  return img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0);
}

test.describe('Activity and Audit Log avatars', () => {
  test('Activity: a person with a picture shows it, one without keeps their initials, and the workspace shows its logo', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/w/${SLUG}/activity`);
    await expect(page.getByText('Film submissions').first()).toBeVisible({ timeout: 60000 });

    // Piyush: the picture, actually loaded
    const piyush = imageOf(page, 'Piyush Prajapat');
    await expect(piyush).toHaveAttribute('src', '/avatars/03.svg');
    await expect.poll(() => imageLoaded(piyush)).toBe(true);
    // Meera has none: initials
    await expect(avatarsIn(page, 'Meera Nair').first()).toContainText('MN');
    await expect(rowOf(page, 'Meera Nair').locator('img')).toHaveCount(0);
    // the workspace's own events: its logo, not "KE"
    const logo = page.locator('section[aria-label] li').filter({ hasText: 'Kala Chashma Entertainment' }).first().locator('span.bg-avatar img');
    await expect(logo).toHaveAttribute('src', '/avatars/05.svg');
    await page.screenshot({ path: testInfo.outputPath('activity-avatars.png') });
  });

  test('Activity: the pictures are decorative, so a name is not read twice', async ({ page, context }) => {
    await installBackend(context);
    await page.goto(`/w/${SLUG}/activity`);
    await expect(page.getByText('Film submissions').first()).toBeVisible({ timeout: 60000 });
    const avatar = avatarsIn(page, 'Piyush Prajapat').first();
    await expect(avatar).toHaveAttribute('aria-hidden', 'true');
    await expect(imageOf(page, 'Piyush Prajapat')).toHaveAttribute('alt', '');
  });

  test('Activity: still shows the picture when the viewer cannot read the team list (the picture comes with the event)', async ({ page, context }) => {
    await installBackend(context, { membersForbidden: true });
    await page.goto(`/w/${SLUG}/activity`);
    await expect(page.getByText('Film submissions').first()).toBeVisible({ timeout: 60000 });
    await expect(imageOf(page, 'Piyush Prajapat')).toHaveAttribute('src', '/avatars/03.svg');
    await expect(avatarsIn(page, 'Meera Nair').first()).toContainText('MN');
  });

  test('Audit Log: the same pictures replace the single-letter circles', async ({ page, context }, testInfo) => {
    await installBackend(context);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/w/${SLUG}/audit`);
    await expect(page.getByRole('table')).toBeVisible({ timeout: 60000 });

    const piyush = page.getByRole('rowheader', { name: 'Piyush Prajapat' }).first().locator('img');
    await expect(piyush).toHaveAttribute('src', '/avatars/03.svg');
    await expect.poll(() => imageLoaded(piyush)).toBe(true);
    // initials are two letters now, like the Activity feed, not one
    await expect(page.getByRole('rowheader', { name: 'Meera Nair' }).first().locator('span.bg-avatar')).toContainText('MN');
    await expect(page.getByRole('rowheader', { name: 'Kala Chashma Entertainment' }).first().locator('img')).toHaveAttribute('src', '/avatars/05.svg');
    await page.screenshot({ path: testInfo.outputPath('audit-avatars.png') });
  });

  test('a picture that is missing falls back to initials instead of a broken image', async ({ page, context }) => {
    await installBackend(context);
    await page.route('**/avatars/03.svg', (route) => route.fulfill({ status: 404, body: 'gone' }));
    await page.goto(`/w/${SLUG}/activity`);
    await expect(page.getByText('Film submissions').first()).toBeVisible({ timeout: 60000 });
    await expect(avatarsIn(page, 'Piyush Prajapat').first()).toContainText('PP');
    await expect(rowOf(page, 'Piyush Prajapat').locator('img')).toHaveCount(0);
  });
});
