import { chromium } from '@playwright/test';
const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 320, height: 640 } });
await c.addCookies([{ name: 'beginso_session', value: 'x', url: 'http://localhost:3100' }]);
const p = await c.newPage();
await p.goto('http://localhost:3100/forms/f1/analytics'); await p.locator('#custom-charts-heading').waitFor({ timeout: 60000 }); await p.waitForTimeout(2500);
const r = await p.evaluate(() => { const W = document.documentElement.clientWidth; return { sw: document.documentElement.scrollWidth, W, off: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > W + 1 && getComputedStyle(e).position !== 'fixed').slice(0, 12).map((e) => e.tagName + '.' + String(e.className).slice(0, 60) + ' r=' + Math.round(e.getBoundingClientRect().right)) }; });
console.log(JSON.stringify(r, null, 1));
await b.close();
