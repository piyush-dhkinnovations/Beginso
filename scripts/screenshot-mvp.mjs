#!/usr/bin/env node
/**
 * Crawls every MVP screen (public + authenticated) and screenshots it, including
 * safe interactive states (modals/dropdowns/tabs opened by clicking buttons).
 *
 * Requires `npm run dev` already running, and a test-account login.
 *
 * Usage:
 *   MVP_TEST_EMAIL=you@test.com MVP_TEST_PASSWORD=secret node scripts/screenshot-mvp.mjs
 *
 * Env vars:
 *   MVP_TEST_EMAIL / MVP_TEST_PASSWORD  (required) - real login for a test/dev account
 *   MVP_BASE_URL     default http://localhost:3000
 *   MVP_OUT_DIR      default ./mvp-screenshots
 *   MVP_HEADLESS     default true (set "false" to watch it run)
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.MVP_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.MVP_TEST_EMAIL;
const PASSWORD = process.env.MVP_TEST_PASSWORD;
const OUT_DIR = path.resolve(process.env.MVP_OUT_DIR || 'mvp-screenshots');
const HEADLESS = process.env.MVP_HEADLESS !== 'false';

if (!EMAIL || !PASSWORD) {
  console.error('Set MVP_TEST_EMAIL and MVP_TEST_PASSWORD (a real test/dev account login) before running.');
  process.exit(1);
}

// The backend is live now, not mocked — never let the crawler click anything that
// mutates or leaves real data (delete/logout/submit/invite/etc). It records what it
// skipped so a human can look at those manually if needed.
const SKIP = /delete|remove|log\s*out|logout|sign\s*out|archive|cancel|revoke|disable|deactivat|suspend|submit|publish|send\b|unsubscribe|downgrade|leave\s|with google|duplicate|invite|export|download|print|create form/i;

const shots = []; // { route, label, file, note }
const notes = []; // freeform skip/limitation notes

// Persistent chrome (sidebar toggle, notification bell, account menu, Next.js dev
// overlay) renders identically on every authenticated page — capture it once total
// instead of once per route, or the output balloons with near-identical images.
// A bare "@" catches the account-menu trigger, whose label is "<name>\n<email>".
const GLOBAL_CHROME = /collapse sidebar|expand sidebar|view notifications|open navigation menu|open next\.js dev tools|@/i;
const globalChromeSeen = new Set();

const slugify = (s) =>
  s.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '') || 'item';

async function shoot(page, route, label) {
  const dir = path.join(OUT_DIR, slugify(route));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slugify(label)}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch((e) => notes.push(`${route}: screenshot failed for "${label}" (${e.message})`));
  shots.push({ route, label, file: path.relative(OUT_DIR, file).replace(/\\/g, '/') });
}

// Clicks every visible button/tab on the current page one at a time (skipping anything
// destructive), screenshots the resulting state, then closes it (Escape) before the next.
async function exploreButtons(page, route, max = 12) {
  const startPath = new URL(page.url()).pathname;
  const tried = new Set();
  for (let i = 0; i < max; i++) {
    const candidates = await page.locator('button:visible, [role="tab"]:visible').all();
    let target = null;
    let label = null;
    for (const el of candidates) {
      const text = ((await el.innerText().catch(() => '')) || (await el.getAttribute('aria-label').catch(() => '')) || '').trim();
      if (!text || tried.has(text)) continue;
      tried.add(text);
      // A <button> nested inside an <a> navigates on click (the click bubbles to the
      // anchor) — treat it as a navigation link, not an in-place interaction. The real
      // destination page is already captured separately by the route walk in main().
      const insideLink = await el.evaluate((node) => !!node.closest('a')).catch(() => false);
      if (insideLink) continue;
      if (SKIP.test(text)) {
        notes.push(`${route}: skipped control "${text}" (looks destructive/irreversible)`);
        continue;
      }
      if (GLOBAL_CHROME.test(text)) {
        if (globalChromeSeen.has(text)) continue; // already captured once elsewhere
        globalChromeSeen.add(text);
      }
      target = el;
      label = text;
      break;
    }
    if (!target) break;
    try {
      await target.click({ timeout: 3000 });
      await page.waitForTimeout(400);
      // If the click navigated to a different route (full navigation, or a forced
      // logout from a stray API error), stop exploring here instead of continuing to
      // click around an unrelated page and mislabeling the results under this route.
      if (new URL(page.url()).pathname !== startPath) {
        notes.push(`${route}: control "${label}" navigated away to ${page.url()} — stopped exploring this page`);
        return;
      }
      await shoot(page, route, `click-${label}`);
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(150);
    } catch {
      notes.push(`${route}: control "${label}" wasn't clickable, skipped`);
    }
  }
}

async function visit(page, route, { explore = true } = {}) {
  const res = await page.goto(BASE_URL + route, { waitUntil: 'networkidle' }).catch(() => null);
  if (!res || !res.ok()) {
    notes.push(`${route}: did not load cleanly (status ${res ? res.status() : 'no response'})`);
  }
  await page.waitForTimeout(300);
  await shoot(page, route, 'default');
  if (explore) await exploreButtons(page, route);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Public pages, before login.
  for (const route of ['/', '/login', '/signup', '/forgot-password', '/verify-email', '/verification-code', '/reset-password']) {
    await visit(page, route);
  }

  // 2. Real login (not via exploreButtons, so we control the credentials used).
  // Dev-mode Turbopack can be slow to hydrate a cold route, so give it one retry
  // before treating a stuck click as a real failure.
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password').fill(PASSWORD);
    const clicked = await page
      .getByRole('button', { name: 'Log In' })
      .click({ timeout: 45000 })
      .then(() => true)
      .catch(() => false);
    if (!clicked) {
      notes.push(`login: attempt ${attempt} — Log In button never became clickable`);
      continue;
    }
    const loggedIn = await page
      .waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    if (loggedIn) break;
    notes.push(`login: attempt ${attempt} — did not redirect away from /login`);
  }

  // 3. Authenticated top-level pages.
  for (const route of ['/dashboard', '/forms', '/templates', '/responses', '/analytics', '/reports']) {
    await visit(page, route);
  }

  // 4. Settings tabs (client-side tab switch, not separate URLs).
  await page.goto(BASE_URL + '/settings', { waitUntil: 'networkidle' });
  for (const tab of ['Profile', 'Workspace', 'Branding', 'Notifications', 'Security']) {
    const tabBtn = page.getByRole('tab', { name: tab });
    if (await tabBtn.count()) {
      await tabBtn.first().click();
      await page.waitForTimeout(300);
      await shoot(page, '/settings', tab);
      await exploreButtons(page, `/settings (${tab})`);
    } else {
      notes.push(`/settings: tab "${tab}" not found`);
    }
  }

  // 5. Pick a real form (if one exists) to walk its edit tabs / preview / analytics / responses.
  await page.goto(BASE_URL + '/forms', { waitUntil: 'networkidle' });
  const editLink = await page.locator('a[href*="/forms/"][href$="/edit"]').first().getAttribute('href').catch(() => null);
  const formId = editLink ? editLink.match(/\/forms\/([^/]+)\/edit/)?.[1] : null;

  if (formId) {
    for (const tab of ['build', 'branding', 'settings', 'share']) {
      await visit(page, `/forms/${formId}/edit?tab=${tab}`);
    }
    await visit(page, `/forms/${formId}/preview`);
    await visit(page, `/forms/${formId}/analytics`);
    await visit(page, `/forms/${formId}/responses`);

    // Discover the public share URL from the Share tab and screenshot the live public form.
    await page.goto(BASE_URL + `/forms/${formId}/edit?tab=share`, { waitUntil: 'networkidle' });
    const publicUrl = await page.locator('#share-public-url').inputValue().catch(() => '');
    const slugMatch = publicUrl.match(/\/f\/([^/?#]+)/);
    if (slugMatch) {
      await visit(page, `/f/${slugMatch[1]}`, { explore: false });
      await visit(page, `/f/${slugMatch[1]}/success`, { explore: false });
    } else {
      notes.push('public form: no share slug found (form may not be published) — /f/[slug] not captured');
    }
  } else {
    notes.push('forms: no existing form found in this account — /forms/[id]/* and /f/[slug]* were not captured. Create one form manually and re-run to get these.');
  }

  // 6. Best-effort: open the first response row from the responses list.
  await page.goto(BASE_URL + '/responses', { waitUntil: 'networkidle' });
  const row = page.locator('table tbody tr, [role="row"]').first();
  if (await row.count()) {
    const before = page.url();
    await row.click().catch(() => {});
    await page.waitForTimeout(400);
    if (page.url() !== before) {
      await shoot(page, '/responses/[id]', 'default');
      await exploreButtons(page, '/responses/[id]');
    } else {
      await shoot(page, '/responses', 'row-clicked');
      notes.push('responses: clicking a row did not navigate — captured whatever state it produced instead');
    }
  } else {
    notes.push('responses: no response rows found — /responses/[id] not captured');
  }

  await browser.close();
  writeInventory();
}

function writeInventory() {
  const byRoute = new Map();
  for (const s of shots) {
    if (!byRoute.has(s.route)) byRoute.set(s.route, []);
    byRoute.get(s.route).push(s);
  }

  let md = `# MVP screen inventory\n\nAuto-generated by \`scripts/screenshot-mvp.mjs\` against \`${BASE_URL}\`. ` +
    `Screenshots live next to this file under \`${path.basename(OUT_DIR)}/<route>/\`.\n\n` +
    `This file lists what was captured per page/state. It does NOT contain written UX analysis ` +
    `(what each screen is for, what a redesign should change) — add that read-through next.\n\n`;

  for (const [route, list] of byRoute) {
    md += `## ${route}\n\n`;
    for (const s of list) {
      md += `- **${s.label}** — ![${s.label}](${s.file})\n`;
    }
    md += '\n';
  }

  if (notes.length) {
    md += `## Skipped / not captured\n\n`;
    for (const n of notes) md += `- ${n}\n`;
    md += '\n';
  }

  fs.writeFileSync(path.join(OUT_DIR, 'INVENTORY.md'), md);
  console.log(`Done. ${shots.length} screenshots in ${OUT_DIR}`);
  console.log(`Inventory: ${path.join(OUT_DIR, 'INVENTORY.md')}`);
  if (notes.length) console.log(`${notes.length} notes (skipped/limited items) — see INVENTORY.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
