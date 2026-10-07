import { chromium } from '@playwright/test';
import fs from 'node:fs';

const SP = 'C:/Users/Xeon6/AppData/Local/Temp/claude/d--Beginso/bbee80af-be9c-494f-9172-b7431714cfa9/scratchpad';
const BASE = 'http://localhost:3100';
const results = [];
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(pass ? 'PASS' : 'FAIL', name, detail); };

await fetch('http://localhost:3101/__reset');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
await ctx.addCookies([{ name: 'beginso_session', value: 'x', url: BASE }]);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });

await page.goto(`${BASE}/forms/f1/analytics`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Add chart' }).first().waitFor({ timeout: 90000 });

const typeLabels = async () => page.locator('fieldset:has(legend:text("Chart type")) label').allInnerTexts();
const dlg = page.getByRole('dialog');
const openMenu = async (btn) => { await btn.scrollIntoViewIfNeeded(); await page.waitForTimeout(1500); await btn.click(); };

// ---- Check 1-4
await page.getByRole('button', { name: 'Add chart' }).first().click();
await dlg.waitFor();
await page.waitForTimeout(500);
const fieldOpts = await page.locator('#chart-field option').allInnerTexts();
ok('field dropdown lists only chartable fields with type', JSON.stringify(fieldOpts) === JSON.stringify(['Satisfaction (Dropdown)', 'Score (Number)', 'Visit date (Date)']), JSON.stringify(fieldOpts));
await page.selectOption('#chart-field', 'f-sat');
let t = (await typeLabels()).map((s) => s.trim());
ok('1 dropdown -> pie/donut/bar/horizontal bar', JSON.stringify(t) === JSON.stringify(['Pie', 'Donut', 'Bar', 'Horizontal bar']), JSON.stringify(t));
await page.getByLabel('Pie', { exact: true }).check();
await page.selectOption('#chart-field', 'f-date');
t = (await typeLabels()).map((s) => s.trim());
ok('2 date -> line/area/bar over time', JSON.stringify(t) === JSON.stringify(['Line', 'Area', 'Bar over time']), JSON.stringify(t));
const lineChecked = await page.getByLabel('Line', { exact: true }).isChecked();
ok('3 invalid type (Pie) reset on field change', lineChecked, 'Line checked=' + lineChecked);
await page.selectOption('#chart-field', 'f-score');
t = (await typeLabels()).map((s) => s.trim());
ok('3 number -> bar/line/average', JSON.stringify(t) === JSON.stringify(['Bar', 'Line', 'Average']), JSON.stringify(t));
const sortOriginal = await page.getByLabel('Scale order (1, 2, 3...)').isChecked();
ok('rating/number sort defaults to scale order', sortOriginal);
await page.selectOption('#chart-field', 'f-sat');
await page.waitForTimeout(700);
const previewBefore = await dlg.locator('section[aria-label="Live preview"] svg[role="group"]').count();
const logBefore = await (await fetch('http://localhost:3101/__log')).json();
ok('4 preview renders before any chart is created', previewBefore === 1 && !logBefore.some((l) => l.startsWith('POST /api/forms/f1/charts')), `svgs=${previewBefore}`);
await page.getByLabel('Donut', { exact: true }).check();
await page.waitForTimeout(300);
const donutText = await dlg.locator('section[aria-label="Live preview"] svg text').first().textContent().catch(() => '');
const sumSlices = (await dlg.locator('section[aria-label="Live preview"] path[aria-label]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('aria-label').match(/: (\d+) \(/)[1])))).reduce((a, b) => a + b, 0);
ok('4 preview updates on type change (donut centre total = sum of slices)', Number(donutText.replace(/,/g, '')) === sumSlices && sumSlices > 0, donutText + ' vs ' + sumSlices);
await page.screenshot({ path: `${SP}/drawer.png` });
const title = await page.inputValue('#chart-title');
ok('title prefilled with field label', title === 'Satisfaction', title);
await page.getByLabel('Pie', { exact: true }).check();
await page.getByText('Small', { exact: true }).click();
await page.getByRole('button', { name: 'Add to dashboard' }).click();
await dlg.waitFor({ state: 'detached' });

async function addChart(field, typeLabel, sizeLabel) {
  await page.getByRole('button', { name: 'Add chart' }).first().click();
  await dlg.waitFor();
  await page.selectOption('#chart-field', field);
  await page.getByLabel(typeLabel, { exact: true }).check();
  await page.getByText(sizeLabel, { exact: true }).click();
  await page.getByRole('button', { name: 'Add to dashboard' }).click();
  await dlg.waitFor({ state: 'detached' });
}
await addChart('f-score', 'Bar', 'Medium');
await addChart('f-date', 'Area', 'Large');
await page.waitForTimeout(1200);

const widths = async () => page.evaluate(() => [...document.querySelectorAll('#custom-charts-heading ~ div > div')].map((d) => Math.round(d.getBoundingClientRect().width)));
let w = await widths();
console.log('widths', w);
const ratio = w.length === 3 && w[0] < w[1] && w[1] < w[2];
ok('5 three charts at three sizes (small<medium<large)', ratio, JSON.stringify(w));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.locator('#custom-charts-heading').waitFor({ timeout: 60000 });
await page.waitForTimeout(2000);
const w2 = await widths();
ok('5 sizes persist across reload', JSON.stringify(w2) === JSON.stringify(w), JSON.stringify(w2));
await page.screenshot({ path: `${SP}/dashboard.png`, fullPage: true });

// ---- Check 6: drill
const firstCard = page.locator('#custom-charts-heading ~ div > div').first();
const slice = firstCard.locator('path[role="button"]').first();
await slice.waitFor();
const label = await slice.getAttribute('aria-label');
const m = label.match(/^(.*): (\d+) \(/);
console.log('slice', label);
await slice.click();
const drawerTitle = await page.locator('#drawer-title').innerText();
await page.waitForTimeout(1500);
const drawerTitle2 = await page.locator('#drawer-title').innerText();
console.log('drill title', drawerTitle2);
ok('6 drill header = "<label> - <n> responses" and n equals chart count', drawerTitle2 === `${m[1]} - ${m[2]} responses`, `${drawerTitle2} vs chart ${m[2]}`);
const rowCount = await page.locator('[role="dialog"] ul li').count();
ok('6 rows listed (server-paginated 20)', rowCount === 20 || rowCount === Number(m[2]), 'rows=' + rowCount);
await page.screenshot({ path: `${SP}/drill.png` });
const reqs = await (await fetch('http://localhost:3101/__log')).json();
ok('6 drill went to server with field+value', reqs.some((l) => /GET \/api\/responses\?.*field=f-sat/.test(l) && l.includes('value=' + encodeURIComponent(m[1]).replace(/%20/g, '+'))), reqs.filter((l) => l.includes('field=f-sat')).slice(-1)[0]);
await page.getByRole('button', { name: 'Load more' }).click().catch(() => {});
// open a row -> response detail via ?responseId
await page.locator('[role="dialog"] ul li button').first().click();
await page.waitForTimeout(1500);
ok('6 row opens response via ?responseId=', page.url().includes('responseId=r'), page.url());
await page.goBack();
await page.waitForTimeout(800);
const panelBack = await page.locator('#drawer-title').innerText().catch(() => '');
ok('6 Back returns to the drill panel', panelBack.includes(m[1]), panelBack);

// ---- Check 7: View all
await page.getByRole('button', { name: 'View all in Responses' }).click();
await page.waitForURL(/\/responses\?/, { timeout: 60000 });
const url7 = page.url();
await page.getByText(`Satisfaction: ${m[1]}`).first().waitFor({ timeout: 60000 });
ok('7 View all lands on /responses?field&value with chip', /field=f-sat/.test(url7) && url7.includes('value='), url7);
const lastResp = (await (await fetch('http://localhost:3101/__log')).json()).filter((l) => l.startsWith('GET /api/responses?')).slice(-1)[0];
ok('7 filter applied through the server request', lastResp.includes('field=f-sat') && lastResp.includes('value='), lastResp);
await page.screenshot({ path: `${SP}/responses.png` });

// ---- Check 8: fresh tab
const page2 = await ctx.newPage();
await page2.goto(url7, { waitUntil: 'domcontentloaded' });
await page2.getByText(`Satisfaction: ${m[1]}`).first().waitFor({ timeout: 60000 });
ok('8 pasted URL in a fresh tab keeps the chip', true, page2.url());
await page2.getByRole('button', { name: /Remove filter: Satisfaction/ }).click();
await page2.waitForTimeout(800);
ok('8 chip clear removes field from URL', !page2.url().includes('field='), page2.url());
await page2.close();

// ---- Check 9: full screen
await page.goto(`${BASE}/forms/f1/analytics`, { waitUntil: 'domcontentloaded' });
await page.locator('#custom-charts-heading').waitFor({ timeout: 60000 });
await page.waitForTimeout(1500);
const card1 = page.locator('#custom-charts-heading ~ div > div').first();
await card1.locator('path[role="button"]').first().waitFor({ timeout: 60000 });
const menuBtn = card1.getByRole('button', { name: /Chart options/ });
await openMenu(menuBtn);
await page.getByRole('menuitem', { name: 'Full screen' }).click();
const fsd = page.locator('[role="dialog"][aria-labelledby="chart-fs-title"]');
await fsd.waitFor();
await page.waitForTimeout(1200);
const sliceLabels = await fsd.locator('path[role="button"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
const tableRows = await fsd.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText)));
console.log(sliceLabels, tableRows);
const chartCounts = sliceLabels.map((l) => { const mm = l.match(/^(.*): (\d+) \(/); return [mm[1], Number(mm[2])]; });
const tblCounts = tableRows.map((r) => [r[0], Number(r[1].replace(/,/g, ''))]).filter((r) => r[1] > 0);
ok('9 full-screen table numbers match the chart', JSON.stringify(chartCounts.sort()) === JSON.stringify(tblCounts.sort()), JSON.stringify(tblCounts));
await page.screenshot({ path: `${SP}/fullscreen.png` });
const [csvDl] = await Promise.all([page.waitForEvent('download'), fsd.getByRole('button', { name: 'CSV' }).click()]);
const csvPath = `${SP}/out.csv`; await csvDl.saveAs(csvPath);
const csvText = (await import('node:fs')).readFileSync(csvPath, 'utf8');
ok('9 CSV exported with exact rows', csvText.includes('Very satisfied') && /Total,\d+/.test(csvText), csvText.split('\n').slice(0, 3).join(' | '));
const [pngDl] = await Promise.all([page.waitForEvent('download'), fsd.getByRole('button', { name: 'PNG' }).click()]);
const pngPath = `${SP}/out.png`; await pngDl.saveAs(pngPath);
const pngBytes = (await import('node:fs')).readFileSync(pngPath);
ok('9 PNG exported (valid PNG signature, >5KB)', pngBytes.slice(1, 4).toString() === 'PNG' && pngBytes.length > 5000, `${pngBytes.length} bytes`);
// drill from full screen, then back
await fsd.locator('path[role="button"]').first().click();
await page.waitForTimeout(1200);
const panelTitle = await page.locator('#drawer-title').innerText();
ok('9 drill works from full screen', /responses$/.test(panelTitle), panelTitle);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
ok('9 Escape closes the panel and returns to full screen', await fsd.isVisible());
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
ok('9 Escape closes full screen', !(await fsd.isVisible().catch(() => false)));
const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName);
ok('9 focus returns to the card menu trigger', /Chart options/.test(focused ?? ''), focused);

// ---- Keyboard drill + reorder
const pie = page.locator('#custom-charts-heading ~ div > div').first().locator('path[role="button"]');
await pie.first().focus();
await page.keyboard.press('ArrowRight');
const activeLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
ok('keyboard: arrow moves focus between segments', activeLabel !== null && activeLabel !== (await pie.first().getAttribute('aria-label')), activeLabel);
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
ok('keyboard: Enter opens drill panel', await page.locator('#drawer-title').isVisible());
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const handle = page.getByRole('button', { name: /Reorder chart Satisfaction/ });
await handle.focus();
await page.keyboard.press('Space');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('Space');
await page.waitForTimeout(1500);
const order = await page.evaluate(() => [...document.querySelectorAll('#custom-charts-heading ~ div > div h3')].map((h) => h.textContent));
const patched = (await (await fetch('http://localhost:3101/__log')).json()).filter((l) => l.startsWith('PATCH'));
console.log('order', order, patched.slice(-3));
ok('keyboard reorder moves chart and persists (PATCH position)', order[0] !== 'Satisfaction' && patched.length > 0, JSON.stringify(order));
const live = await page.locator('[aria-live]').allInnerTexts();
console.log('live regions', live.filter(Boolean));

// ---- resize + remove with undo
const cardScore = page.locator('#custom-charts-heading ~ div > div').filter({ hasText: 'Score' }).first();
await openMenu(cardScore.getByRole('button', { name: /Chart options/ }));
await page.getByRole('menuitem', { name: 'Size: Large' }).click();
await page.waitForTimeout(1000);
const wScore = await cardScore.evaluate((e) => Math.round(e.getBoundingClientRect().width));
ok('resize after creation (card menu)', wScore > 1000, 'width=' + wScore);
const before = (await (await fetch('http://localhost:3101/api/forms/f1/charts')).json()).charts.length;
await openMenu(cardScore.getByRole('button', { name: /Chart options/ }));
await page.getByRole('menuitem', { name: 'Remove' }).click();
await page.getByRole('button', { name: 'Undo' }).waitFor({ timeout: 5000 });
ok('remove shows undo toast', true);
await page.getByRole('button', { name: 'Undo' }).click();
await page.waitForTimeout(1500);
const after = (await (await fetch('http://localhost:3101/api/forms/f1/charts')).json()).charts.length;
ok('undo restores the chart', after === before, `${before} -> ${after}`);
// edit reopens drawer with current settings
const cardSat = page.locator('#custom-charts-heading ~ div > div').filter({ hasText: 'Satisfaction' }).first();
await openMenu(cardSat.getByRole('button', { name: /Chart options/ }));
await page.getByRole('menuitem', { name: 'Edit' }).click();
await dlg.waitFor();
ok('edit reopens drawer with current settings', (await page.inputValue('#chart-field')) === 'f-sat' && (await page.getByLabel('Pie', { exact: true }).isChecked()), '');
await page.keyboard.press('Escape');

// ---- Check 10: mobile
const mctx = await browser.newContext({ viewport: { width: 320, height: 640 } });
await mctx.addCookies([{ name: 'beginso_session', value: 'x', url: BASE }]);
const mp = await mctx.newPage();
await mp.goto(`${BASE}/forms/f1/analytics`, { waitUntil: 'domcontentloaded' });
await mp.locator('#custom-charts-heading').waitFor({ timeout: 60000 });
await mp.waitForTimeout(2000);
const overflowPage = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok('10 dashboard has no horizontal overflow at 320px', overflowPage <= 0, 'overflow=' + overflowPage);
await mp.screenshot({ path: `${SP}/mobile-dash.png`, fullPage: true });
await mp.getByRole('button', { name: 'Add chart' }).first().click();
const md = mp.getByRole('dialog');
await md.waitFor();
await mp.waitForTimeout(800);
const box = await md.boundingBox();
const dOverflow = await md.evaluate((e) => [...e.querySelectorAll('*')].filter((n) => n.getBoundingClientRect().right > e.getBoundingClientRect().right + 1).length);
ok('10 add-chart sheet is full-screen and nothing overflows', box.width <= 320 && box.width >= 319 && box.height >= 639 && dOverflow === 0, JSON.stringify(box) + ' overflowing=' + dOverflow);
await mp.screenshot({ path: `${SP}/mobile-drawer.png` });
await mp.keyboard.press('Escape');
await mp.waitForTimeout(400);
const mslice = mp.locator('#custom-charts-heading ~ div > div').first().locator('path[role="button"]').first();
await mslice.scrollIntoViewIfNeeded();
await mslice.click({ force: true });
await mp.waitForTimeout(1500);
const pbox = await mp.getByRole('dialog').boundingBox();
const pOverflow = await mp.getByRole('dialog').evaluate((e) => [...e.querySelectorAll('*')].filter((n) => n.getBoundingClientRect().right > e.getBoundingClientRect().right + 1).length);
ok('10 drill panel is a full-screen sheet with no overflow', pbox.width <= 320 && pbox.height >= 639 && pOverflow === 0, JSON.stringify(pbox) + ' overflowing=' + pOverflow);
await mp.screenshot({ path: `${SP}/mobile-drill.png` });

await browser.close();
console.log('\nSUMMARY', results.filter((r) => !r.pass).length, 'failed of', results.length);
