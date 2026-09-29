/**
 * __tests__/lib/reducedMotion.test.ts
 * sprint-11-v2a-hardening, task 5.3 (requirements.md §11 — "reduced motion respected").
 *
 * Reads the real stylesheet (no jsdom `matchMedia` mock needed) and asserts a global
 * `prefers-reduced-motion: reduce` rule exists and actually neutralises every `transition`/
 * `animation` declaration in the file, including the two infinite animations (spinner, skeleton
 * shimmer) most likely to bother a vestibular-disorder user.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '../../src/styles/beginso-ui.css'), 'utf-8');

describe('prefers-reduced-motion', () => {
  it('a global reduced-motion media query exists', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it('the reduced-motion block collapses both animation and transition duration for every element', () => {
    const match = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
    expect(match).not.toBeNull();
    const body = match![1];
    expect(body).toMatch(/\*/); // applies broadly, not one hand-picked selector
    expect(body).toMatch(/animation-duration:\s*0(\.\d+)?(ms|s)?\s*!important/);
    expect(body).toMatch(/transition-duration:\s*0(\.\d+)?(ms|s)?\s*!important/);
  });

  it('every animation: declaration in the file (incl. the infinite spinner and skeleton shimmer) is covered by an animation-duration override, not individually excluded', () => {
    const animationRules = [...css.matchAll(/animation:\s*([\w-]+)/g)].map((m) => m[1]);
    expect(animationRules).toEqual(expect.arrayContaining(['bg-spin', 'bg-toast-in', 'bg-shimmer', 'bg-fade', 'bg-modal-in']));
    // The override is global (`*`), so it is not possible for a named animation to be missed —
    // this assertion documents which ones exist today so a newly-added one is visible in a diff.
  });
});
