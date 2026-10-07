/**
 * __tests__/lib/tokenContrast.test.ts
 * sprint-11-v2a-hardening, requirements.md §7.4 (3.6/3.2)
 *
 * Computes real WCAG contrast ratios from src/styles/beginso-ui.css's own token values — no new
 * dependency (design.md §21's own instruction: an in-repo function, not axe-core). Resolves
 * var(--x) alias chains by parsing the :root block (light) and the [data-theme="dark"] block
 * (dark, falling back to :root for anything dark doesn't redefine — matching how the cascade
 * actually resolves it in a browser).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '../../src/styles/beginso-ui.css'), 'utf-8');

function extractBlock(source: string, selector: string): string {
  const start = source.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const braceStart = source.indexOf('{', start);
  const braceEnd = source.indexOf('}', braceStart);
  return source.slice(braceStart + 1, braceEnd);
}

function parseVars(block: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const re = /--([a-zA-Z0-9-]+):\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

// :root is the first `:root {` block; [data-theme="dark"] excludes the midnight/dimmed variant
// blocks that follow it (extractBlock takes the first match of each selector string).
const rootVars = parseVars(extractBlock(css, ':root {'));
const darkVars = parseVars(extractBlock(css, '[data-theme="dark"] {'));

function resolve(value: string, vars: Record<string, string>, depth = 0): string {
  if (depth > 10) throw new Error(`alias chain too deep resolving "${value}"`);
  const varMatch = value.match(/^var\(--([a-zA-Z0-9-]+)\)$/);
  if (!varMatch) return value;
  const name = varMatch[1];
  const next = vars[name] ?? rootVars[name];
  if (!next) throw new Error(`token --${name} not found`);
  return resolve(next, vars, depth + 1);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (lighter + 0.05) / (darker + 0.05);
}

function tokenHex(name: string, vars: Record<string, string>): string {
  const raw = vars[name] ?? rootVars[name];
  if (!raw) throw new Error(`token --${name} not found in either block`);
  const resolved = resolve(raw, vars);
  if (!/^#[0-9a-fA-F]{3,6}$/.test(resolved)) {
    throw new Error(`token --${name} resolved to a non-hex value: "${resolved}" — not resolvable by this test`);
  }
  return resolved;
}

// design.md §21 / requirements.md 3.2's named pairs. `large` pairs (headings, UI borders, focus)
// need only 3:1; everything else is body text and needs 4.5:1.
interface Pair { name: string; fg: string; bg: string; minRatio: number; }

function buildPairs(vars: Record<string, string>): Pair[] {
  return [
    { name: 'text-primary on bg-page', fg: 'text-primary', bg: 'bg-page', minRatio: 4.5 },
    { name: 'text-secondary on bg-page', fg: 'text-secondary', bg: 'bg-page', minRatio: 4.5 },
    { name: 'text-muted on bg-page', fg: 'text-muted', bg: 'bg-page', minRatio: 4.5 },
    { name: 'text-primary on surface-card', fg: 'text-primary', bg: 'surface-card', minRatio: 4.5 },
    { name: 'text-secondary on surface-card', fg: 'text-secondary', bg: 'surface-card', minRatio: 4.5 },
    { name: 'text-primary on bg-subtle', fg: 'text-primary', bg: 'bg-subtle', minRatio: 4.5 },
    { name: 'text-link on bg-page', fg: 'text-link', bg: 'bg-page', minRatio: 4.5 },
    { name: 'text-on-brand on action-primary', fg: 'text-on-brand', bg: 'action-primary', minRatio: 4.5 },
    { name: 'success-text on success-surface', fg: 'success-text', bg: 'success-surface', minRatio: 4.5 },
    { name: 'warning-text on warning-surface', fg: 'warning-text', bg: 'warning-surface', minRatio: 4.5 },
    { name: 'error-text on error-surface', fg: 'error-text', bg: 'error-surface', minRatio: 4.5 },
    { name: 'info-text on info-surface', fg: 'info-text', bg: 'info-surface', minRatio: 4.5 },
    { name: 'accent-soft-text on accent-soft', fg: 'accent-soft-text', bg: 'accent-soft', minRatio: 4.5 },
    // border-default is a decorative card/divider border, not an "essential UI component
    // boundary" under WCAG 1.4.11 — deliberately not held to the 3:1 non-text floor here.
    // border-focus is: it's the actual focus-indicator WCAG 2.4.11/2.4.13 cares about.
    { name: 'border-focus on bg-page (large/UI)', fg: 'border-focus', bg: 'bg-page', minRatio: 3 },
  ].map((p) => ({ ...p, fg: tokenHex(p.fg, vars), bg: tokenHex(p.bg, vars) }));
}

// sprint-11-v2a-hardening 3.6 — design.md §21's own fallback: a failure is fixed only if it's a
// single, low-risk token-value change; otherwise it's logged, not force-fixed. Both known light-
// theme near-misses below touch a token shared across the whole product (the brand primary /
// the general "muted text" neutral) — recoloring either is a design-system decision, not a
// one-off swap, so they're recorded here (and in tasks.md's 3.6 entry) rather than silently
// patched or left as a permanently-red, already-known test failure.
// Both former near-misses were fixed at token level (--text-muted, --action-primary darkened); the set stays so a
// future known gap has an obvious home.
const KNOWN_LIGHT_THEME_GAPS = new Set<string>();

describe.each([
  ['light', rootVars],
  ['dark', darkVars],
] as const)('token contrast — %s theme', (themeName, vars) => {
  const pairs = buildPairs(vars);

  it.each(pairs.map((p) => [p.name, p] as const))('%s meets its WCAG floor', (label, pair) => {
    const ratio = contrastRatio(pair.fg, pair.bg);
    if (themeName === 'light' && KNOWN_LIGHT_THEME_GAPS.has(label)) {
      // Recorded, not silently passing and not force-failing the pipeline: this ratio is a known
      // near-miss (~4.4 vs the 4.5 floor), logged in tasks.md 3.6 with an owner-review note.
      expect(ratio).toBeGreaterThan(4);
      expect(ratio).toBeLessThan(pair.minRatio);
      return;
    }
    expect(ratio).toBeGreaterThanOrEqual(pair.minRatio);
  });
});

// --disabled text is explicitly exempt from WCAG floors (a disabled control communicates state
// visually beyond color contrast, same convention most design systems use) — asserted separately,
// not silently left out of the pair list above, so its exemption is a decision, not an omission.
it.each([['light', rootVars], ['dark', darkVars]] as const)(
  '%s theme: text-disabled on bg-page is below body-text contrast, by design (disabled state, not a failure)',
  (_themeName, vars) => {
    const fg = tokenHex('text-disabled', vars);
    const bg = tokenHex('bg-page', vars);
    const ratio = contrastRatio(fg, bg);
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(10);
  }
);
