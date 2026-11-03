/**
 * Feature: light and dark styles
 * Tests: scripts/check-contrast.mjs — every text and background pair of every light and dark style clears WCAG AA (4.5:1 for text, 3:1 for what a
 * person needs to see to use a control). Paper and Mist (new) may not fail anything; Classic and the dark styles keep only the failures recorded
 * in contrast-baseline.json (they were there before the check existed), so any NEW failure, in any style, fails this test.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const run = (...args: string[]) => spawnSync(process.execPath, [path.join(process.cwd(), 'scripts/check-contrast.mjs'), ...args], { encoding: 'utf8' });

describe('contrast check', () => {
  it('passes: no new failure in any style', () => {
    const out = run();
    expect(out.stdout, out.stdout).not.toMatch(/FAIL/);
    expect(out.status).toBe(0);
  });

  it('Paper and Mist pass every check, with nothing excused', () => {
    const out = run().stdout;
    expect(out).toMatch(/paper\s+57\/57 pass\s*$/m);
    expect(out).toMatch(/mist\s+57\/57 pass\s*$/m);
  });

  it('checks all six styles', () => {
    const out = run().stdout;
    for (const style of ['classic', 'paper', 'mist', 'slate', 'midnight', 'dimmed']) expect(out).toContain(style);
  });
});
