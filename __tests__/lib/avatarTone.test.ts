import { describe, it, expect } from 'vitest';
import { avatarHue } from '@/lib/avatarTone';

describe('avatarHue', () => {
  it('is stable for a name, ignores case and surrounding spaces, and is undefined without a name', () => {
    expect(avatarHue('Harsh Vora')).toBe(avatarHue('Harsh Vora'));
    expect(avatarHue('  harsh vora ')).toBe(avatarHue('Harsh Vora'));
    expect(avatarHue('')).toBeUndefined();
    expect(avatarHue('   ')).toBeUndefined();
    expect(avatarHue(null)).toBeUndefined();
    expect(avatarHue(undefined)).toBeUndefined();
  });

  it('gives a list of real respondents several different colours, not one (the Respondent column was all the same blue)', () => {
    const names = ['Harsh Vora', 'Gerald Gray', 'Ratin Mehta', 'Afzal Shaikh', 'Jayesh Patel', 'Piyush Prajapat', 'xyz', 'Vinod Umrao', 'Mukul Gupta', 'Shastri Pal', 'Saikumar V'];
    const hues = new Set(names.map((n) => avatarHue(n)));
    expect(hues.size).toBeGreaterThanOrEqual(6);
  });

  it('always returns a hue between 0 and 360', () => {
    for (const name of ['a', 'b', 'Zoë', '李雷', 'x'.repeat(200), 'someone@example.com']) {
      const h = avatarHue(name)!;
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
    }
  });
});

// Text on the coloured disc must clear 4.5:1 for EVERY hue, in light and dark (WCAG AA for normal text). Same HSL values as beginso-ui.css.
function luminance([r, g, b]: number[]): number {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function hsl(h: number, s: number, l: number): number[] {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('avatar colours stay readable', () => {
  const hues = Array.from({ length: 36 }, (_, i) => i * 10); // every 10 degrees covers all eighteen in use with room to spare
  it.each(hues)('hue %i: text contrast is at least 4.5:1 in light mode', (h) => {
    expect(ratio(hsl(h, 75, 90), hsl(h, 65, 24))).toBeGreaterThanOrEqual(4.5);
  });
  it.each(hues)('hue %i: text contrast is at least 4.5:1 in dark mode', (h) => {
    expect(ratio(hsl(h, 38, 26), hsl(h, 85, 90))).toBeGreaterThanOrEqual(4.5);
  });
});
