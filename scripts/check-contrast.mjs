// Contrast check for every light and dark style, read straight from src/styles/beginso-ui.css (so it cannot drift from what ships).
//   node scripts/check-contrast.mjs            checks, prints the table, exits 1 on any failure that is not in the recorded baseline
//   node scripts/check-contrast.mjs --table    prints the table only
//   node scripts/check-contrast.mjs --baseline rewrites scripts/contrast-baseline.json from the current failures (Classic and the dark styles only)
//
// Rules (WCAG 2.2 AA): 4.5:1 for text, 3:1 for the things a person has to see to use a control (its border, the focus ring, a switch that is off, a
// primary button against the page). Separators between cards (--border-default, --border-subtle) and disabled text are decorative or exempt: they
// are listed with their ratio and never fail. "Paper" and "Mist" (new) may not fail anything. Classic and the three dark styles existed before
// this check; failures that were already there are recorded in contrast-baseline.json and are reported as "known", while any NEW failure fails.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'src/styles/beginso-ui.css'), 'utf8');
const baselinePath = path.join(root, 'scripts/contrast-baseline.json');

// ---- tokens per style --------------------------------------------------------------------------------------------------------------
function block(selector) {
  const i = css.indexOf(`\n${selector} {`);
  if (i < 0) throw new Error(`no block for ${selector}`);
  const end = css.indexOf('\n}', i);
  const body = css.slice(i, end);
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const base = block(':root');
const slate = block('[data-theme="dark"]');
const STYLES = {
  classic: { dark: false, tokens: { ...base } },
  paper: { dark: false, tokens: { ...base, ...block(':root[data-light="paper"]') }, isNew: true },
  mist: { dark: false, tokens: { ...base, ...block(':root[data-light="mist"]') }, isNew: true },
  slate: { dark: true, tokens: { ...base, ...slate } },
  midnight: { dark: true, tokens: { ...base, ...slate, ...block('[data-theme="dark"][data-dark="midnight"]') } },
  dimmed: { dark: true, tokens: { ...base, ...slate, ...block('[data-theme="dark"][data-dark="dimmed"]') } },
};

function resolve(tokens, value, depth = 0) {
  if (depth > 8) return null;
  const v = value.trim();
  const m = v.match(/^var\((--[\w-]+)\)$/);
  if (m) return tokens[m[1]] === undefined ? null : resolve(tokens, tokens[m[1]], depth + 1);
  return v;
}
function toRgb(hex) {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(h)) return null;
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
}
const lum = ([r, g, b]) => {
  const c = [r, g, b].map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---- the pairs ---------------------------------------------------------------------------------------------------------------------
const SURFACES = ['--bg-page', '--bg-subtle', '--bg-sunken', '--surface-card', '--surface-hover', '--surface-active', '--accent-soft'];
const PAIRS = [];
const add = (kind, min, fg, bgs) => bgs.forEach((bg) => PAIRS.push({ kind, min, fg, bg }));
['--text-primary', '--text-secondary', '--text-muted', '--text-link'].forEach((fg) => add('text', 4.5, fg, SURFACES));
add('text', 4.5, '--accent-soft-text', ['--accent-soft', '--accent-soft-hover']);
add('text', 4.5, '--text-on-brand', ['--action-primary', '--action-primary-hover', '--action-primary-active']);
add('text', 4.5, '--text-inverse', ['--surface-inverse']);
[['success', '--success-surface'], ['warning', '--warning-surface'], ['error', '--error-surface'], ['info', '--info-surface']].forEach(([n, bg]) => add('text', 4.5, `--${n}-text`, [bg, '--bg-page', '--surface-card']));
add('control', 3, '--border-strong', ['--bg-page', '--surface-card', '--bg-subtle']);
add('control', 3, '--border-focus', ['--bg-page', '--surface-card', '--bg-sunken', '--accent-soft']);
add('control', 3, '--control-off', ['--surface-card', '--bg-page']);
add('control', 3, '--action-primary', ['--bg-page', '--surface-card']);
add('decorative', 0, '--border-default', ['--bg-page', '--surface-card']);
add('decorative', 0, '--border-subtle', ['--bg-page', '--surface-card']);
add('exempt', 0, '--text-disabled', ['--bg-page', '--surface-card']);

const rows = [];
for (const [style, def] of Object.entries(STYLES)) {
  for (const p of PAIRS) {
    const fg = resolve(def.tokens, def.tokens[p.fg] ?? '');
    const bg = resolve(def.tokens, def.tokens[p.bg] ?? '');
    const a = fg && toRgb(fg);
    const b = bg && toRgb(bg);
    if (!a || !b) { rows.push({ style, ...p, ratio: null, note: 'not a plain colour', pass: true }); continue; }
    const r = ratio(a, b);
    rows.push({ style, ...p, ratio: r, pass: p.min === 0 || r >= p.min });
  }
}

const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : {};
const key = (r) => `${r.fg} on ${r.bg}`;
const failing = rows.filter((r) => !r.pass);
const status = (r) => (r.pass ? 'pass' : STYLES[r.style].isNew ? 'FAIL' : (baseline[r.style] ?? []).includes(key(r)) ? 'known' : 'FAIL');

if (process.argv.includes('--baseline')) {
  const out = {};
  for (const r of failing) if (!STYLES[r.style].isNew) (out[r.style] ??= []).push(key(r));
  fs.writeFileSync(baselinePath, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`baseline written: ${failing.filter((r) => !STYLES[r.style].isNew).length} existing failures`);
  process.exit(0);
}

// ---- the table ---------------------------------------------------------------------------------------------------------------------
const lines = ['| style | check | foreground | background | ratio | needs | result |', '|---|---|---|---|---|---|---|'];
for (const r of rows) lines.push(`| ${r.style} | ${r.kind} | ${r.fg} | ${r.bg} | ${r.ratio === null ? 'n/a' : r.ratio.toFixed(2)} | ${r.min || '-'} | ${status(r)} |`);
if (process.argv.includes('--table')) console.log(lines.join('\n'));

const summary = Object.keys(STYLES).map((s) => {
  const mine = rows.filter((r) => r.style === s && r.min > 0);
  const bad = mine.filter((r) => status(r) === 'FAIL').length;
  const known = mine.filter((r) => status(r) === 'known').length;
  return `${s.padEnd(9)} ${mine.length - bad - known}/${mine.length} pass${known ? `, ${known} known (existing before this check)` : ''}${bad ? `, ${bad} FAIL` : ''}`;
});
console.log(summary.join('\n'));
const fails = rows.filter((r) => status(r) === 'FAIL');
for (const r of fails) console.log(`FAIL  ${r.style}: ${key(r)} = ${r.ratio?.toFixed(2)} (needs ${r.min})`);
process.exit(fails.length ? 1 : 0);
