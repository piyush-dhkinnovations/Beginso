import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Tailwind's default rounded-full is calc(infinity * 1px); the CSS minifier turned it into "340.282px .375rem", so every round photo and logo
// came out as a leaf (two big corners, two small). A plain number in the theme keeps the circle.
describe('round images', () => {
  it('the theme gives rounded-full a plain size, never calc(infinity ...)', () => {
    const css = fs.readFileSync(path.join(__dirname, '../../src/app/globals.css'), 'utf8');
    expect(css).toMatch(/@theme[\s\S]*--radius-full:\s*9999px/);
    expect(css).not.toMatch(/calc\(\s*infinity/);
  });
});
